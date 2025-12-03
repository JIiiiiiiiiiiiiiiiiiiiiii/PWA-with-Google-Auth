import React, { useEffect, useState } from "react"
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom"
import { Trophy } from "lucide-react"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Tasks from "./pages/Tasks"
import TaskDetail from "./pages/TaskDetail"
import CreateTask from "./pages/CreateTask"
import EditTask from "./pages/EditTask"
import Profile from "./pages/Profile"
import { apiGet } from "./utils/api"
import { dbAuth } from "./utils/db"

function App() {
	const [user, setUser] = useState(null)
	const [ready, setReady] = useState(false)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [oauthInProgress, setOauthInProgress] = useState(false) // Track OAuth callback in progress
	const location = useLocation()

	// Track last API call time to prevent infinite loops
	const lastApiCallRef = React.useRef(0)
	const oauthCheckDoneRef = React.useRef(false)
	const isLoggingOutRef = React.useRef(false) // Prevent re-authentication during logout
	const oauthInProgressRef = React.useRef(false) // Track OAuth callback in progress (for refs)

	useEffect(() => {
		const loadUser = async (retryCount = 0) => {
			// CRITICAL: Don't load user if we're in the middle of logging out
			// Check both ref (current session) and sessionStorage (persists across refresh)
			const isLoggingOut =
				isLoggingOutRef.current ||
				sessionStorage.getItem("isLoggingOut") === "true"
			if (isLoggingOut) {
				setUser(null)
				setReady(true)
				setTimeout(() => {
					sessionStorage.removeItem("isLoggingOut")
				}, 5000)
				return
			}

			// Check if this is an OAuth callback (redirected from Google to /dashboard)
			const isOAuthCallback =
				window.location.pathname === "/dashboard" &&
				!user &&
				retryCount === 0

			if (isOAuthCallback) {
				// IMMEDIATELY set OAuth in progress to prevent route protection redirect
				oauthInProgressRef.current = true
				setOauthInProgress(true)
			}

			// Prevent too frequent API calls (cooldown of 1 second) - but allow retries for OAuth
			const now = Date.now()
			if (
				now - lastApiCallRef.current < 1000 &&
				retryCount > 3 &&
				!isOAuthCallback
			) {
				// Use cache if we've called too recently and already retried multiple times
				try {
					const cachedUser = await dbAuth.getUser()
					// Don't use cache if logout is in progress
					const isLoggingOut =
						isLoggingOutRef.current ||
						sessionStorage.getItem("isLoggingOut") === "true"
					if (!isLoggingOut) {
						setUser(cachedUser)
					} else {
						setUser(null)
					}
				} catch (dbError) {
					setUser(null)
				} finally {
					setReady(true)
				}
				return
			}
			lastApiCallRef.current = now

			try {
				// Try to get user from API
				const response = await apiGet("/api/auth/me")
				const user = response.data.user
				if (user) {
					// Don't set user if logout is in progress (check both ref and sessionStorage)
					const isLoggingOut =
						isLoggingOutRef.current ||
						sessionStorage.getItem("isLoggingOut") === "true"
					if (isLoggingOut) {
						setUser(null)
						setReady(true)
						return
					}
					setUser(user)
					// Cache user in IndexedDB
					await dbAuth.setUser(user)
					setReady(true)
					oauthCheckDoneRef.current = true
					oauthInProgressRef.current = false // OAuth complete
					setOauthInProgress(false) // OAuth complete
					// Dispatch login event to ensure state is synced
					window.dispatchEvent(
						new CustomEvent("user-logged-in", { detail: user })
					)
				} else {
					// If no user from API, try cache (but not if logout in progress)
					const isLoggingOut =
						isLoggingOutRef.current ||
						sessionStorage.getItem("isLoggingOut") === "true"
					if (!isLoggingOut) {
						const cachedUser = await dbAuth.getUser()
						if (cachedUser) {
							setUser(cachedUser)
							setReady(true)
							oauthInProgressRef.current = false
							setOauthInProgress(false)
						} else {
							// If OAuth callback (just redirected from Google), retry multiple times
							if (
								retryCount < 8 &&
								window.location.pathname === "/dashboard" &&
								!oauthCheckDoneRef.current
							) {
								// Keep OAuth in progress flag set
								oauthInProgressRef.current = true
								setOauthInProgress(true)
								// Retry with increasing delay for cookie to be set
								const delay = Math.min(
									500 + retryCount * 200,
									1500
								)
								setTimeout(() => {
									loadUser(retryCount + 1)
								}, delay)
								return
							}
							oauthInProgressRef.current = false
							setOauthInProgress(false)
							oauthCheckDoneRef.current = true
							setUser(null)
							setReady(true)
						}
					} else {
						setUser(null)
						setReady(true)
					}
				}
			} catch (error) {
				// Offline or error: try cache (but not if logout in progress)
				const isLoggingOut =
					isLoggingOutRef.current ||
					sessionStorage.getItem("isLoggingOut") === "true"
				if (!isLoggingOut) {
					try {
						const cachedUser = await dbAuth.getUser()
						if (cachedUser) {
							setUser(cachedUser)
							setReady(true)
							oauthInProgressRef.current = false
							setOauthInProgress(false)
						} else {
							// If OAuth callback, retry many times
							if (
								retryCount < 8 &&
								window.location.pathname === "/dashboard" &&
								!oauthCheckDoneRef.current
							) {
								// Keep OAuth in progress flag set
								oauthInProgressRef.current = true
								setOauthInProgress(true)
								// Retry with increasing delay
								const delay = Math.min(
									500 + retryCount * 200,
									1500
								)
								setTimeout(() => {
									loadUser(retryCount + 1)
								}, delay)
								return
							}
							oauthInProgressRef.current = false
							setOauthInProgress(false)
							oauthCheckDoneRef.current = true
							setUser(null)
							setReady(true)
						}
					} catch (dbError) {
						if (
							retryCount < 8 &&
							window.location.pathname === "/dashboard" &&
							!oauthCheckDoneRef.current
						) {
							oauthInProgressRef.current = true
							setOauthInProgress(true)
							const delay = Math.min(500 + retryCount * 200, 1500)
							setTimeout(() => {
								loadUser(retryCount + 1)
							}, delay)
							return
						}
						oauthInProgressRef.current = false
						setOauthInProgress(false)
						setUser(null)
						setReady(true)
					}
				} else {
					setUser(null)
					setReady(true)
				}
				// Only mark as done after max retries
				if (retryCount >= 8) {
					oauthCheckDoneRef.current = true
					oauthInProgressRef.current = false
					setOauthInProgress(false)
				}
			}
		}
		loadUser()

		// Listen for login events - update user state IMMEDIATELY and SYNCHRONOUSLY
		const handleUserLoggedIn = (event) => {
			const user = event.detail
			if (user) {
				isLoggingOutRef.current = false
				setUser(user)
				setReady(true)
				oauthCheckDoneRef.current = true
				dbAuth.setUser(user).catch(() => {})
			}
		}
		window.addEventListener("user-logged-in", handleUserLoggedIn)

		// Listen for logout events - clear user state IMMEDIATELY
		const handleUserLoggedOut = () => {
			isLoggingOutRef.current = true
			sessionStorage.setItem("isLoggingOut", "true")
			setUser(null)
			oauthCheckDoneRef.current = false
			oauthInProgressRef.current = false
			setOauthInProgress(false)
			dbAuth.clear().catch(() => {})
			setTimeout(() => {
				isLoggingOutRef.current = false
				sessionStorage.removeItem("isLoggingOut")
			}, 10000)
		}
		window.addEventListener("user-logged-out", handleUserLoggedOut)

		return () => {
			window.removeEventListener("user-logged-in", handleUserLoggedIn)
			window.removeEventListener("user-logged-out", handleUserLoggedOut)
		}
	}, [])

	// Handle OAuth callback and login redirect - check user when navigating to protected routes
	useEffect(() => {
		const checkUserOnProtectedRoute = async () => {
			// DON'T check if we're in the middle of logging out
			if (isLoggingOutRef.current) {
				return
			}

			// DON'T check if OAuth is in progress (prevents premature redirect)
			if (oauthInProgressRef.current || oauthInProgress) {
				return
			}

			// If we're on a protected route and don't have a user, check immediately
			const protectedRoutes = ["/dashboard", "/tasks", "/profile"]
			if (protectedRoutes.includes(location.pathname) && !user && ready) {
				// Don't check if we just loaded user (might be OAuth callback in progress)
				// Wait longer for OAuth - cookie might take time to be set
				if (lastApiCallRef.current > Date.now() - 10000) {
					// Recent API call, wait a bit for it to complete (especially for OAuth)
					return
				}

				// If we're on /dashboard and no user, it might be OAuth callback - wait longer
				if (
					location.pathname === "/dashboard" &&
					lastApiCallRef.current > Date.now() - 15000
				) {
					return
				}

				// Prevent multiple simultaneous checks
				if (oauthCheckDoneRef.current) {
					return
				}
				oauthCheckDoneRef.current = true

				// First, try cache immediately (synchronous check) - NO DELAY
				try {
					const cachedUser = await dbAuth.getUser()
					if (cachedUser) {
						console.log(
							"[App] Using cached user from IndexedDB for protected route"
						)
						setUser(cachedUser)
						setReady(true)
						oauthCheckDoneRef.current = false // Allow future checks
						return
					}
				} catch (err) {
					// No cache, continue to API check
				}

				// Check immediately - NO DELAY
				// Check cooldown
				const now = Date.now()
				if (now - lastApiCallRef.current < 1000) {
					oauthCheckDoneRef.current = false // Allow retry
					return
				}
				lastApiCallRef.current = now

				try {
					console.log(
						"[App] Checking user authentication for protected route"
					)
					const response = await apiGet("/api/auth/me")
					const user = response.data.user
					if (user) {
						console.log("[App] User authenticated:", user)
						setUser(user)
						setReady(true)
						// Save to IndexedDB (async, don't wait)
						dbAuth.setUser(user).catch(console.error)
						window.dispatchEvent(
							new CustomEvent("user-logged-in", { detail: user })
						)
					} else {
						// No user from API - will redirect via Navigate
						oauthCheckDoneRef.current = false
					}
				} catch (error) {
					// User not authenticated - will redirect via Navigate
					oauthCheckDoneRef.current = false
				}
			}
		}
		checkUserOnProtectedRoute()
	}, [location.pathname, user, ready])

	const closeMobileMenu = () => setMobileMenuOpen(false)

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex flex-col">
			{/* NAVBAR */}
			<nav className="sticky top-0 z-50 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white shadow-2xl border-b border-slate-700/40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						{/* LOGO */}
						<Link
							to="/"
							className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl font-bold hover:opacity-90 transition flex-shrink-0">
							<span className="hidden sm:inline bg-gradient-to-r from-yellow-300 to-blue-300 bg-clip-text text-transparent">
								Task Master
							</span>
						</Link>

						{/* DESKTOP MENU */}
						<div className="hidden md:flex items-center space-x-6 lg:space-x-8 font-medium">
							<Link
								className="hover:text-yellow-300 transition duration-200"
								to="/">
								Home
							</Link>
							{user && (
								<>
									<Link
										className="hover:text-yellow-300 transition duration-200"
										to="/dashboard">
										Dashboard
									</Link>
									<Link
										className="hover:text-yellow-300 transition duration-200"
										to="/tasks">
										Tasks
									</Link>
								</>
							)}

							{user ? (
								<>
									<Link
										className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition font-semibold text-sm"
										to="/profile">
										{user.name}
									</Link>
								</>
							) : (
								<>
									<Link
										className="hover:text-yellow-300 transition duration-200"
										to="/auth/login">
										Login
									</Link>
									<Link
										className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-semibold text-sm"
										to="/auth/register">
										Create Account
									</Link>
								</>
							)}
						</div>

						{/* MOBILE MENU BUTTON */}
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="md:hidden p-2 rounded-lg hover:bg-white/10 transition">
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						</button>
					</div>

					{/* MOBILE MENU */}
					{mobileMenuOpen && (
						<div className="md:hidden pb-4 space-y-3 border-t border-blue-500/30 pt-4">
							<Link
								className="block px-4 py-2 hover:bg-white/10 rounded-lg transition"
								to="/"
								onClick={closeMobileMenu}>
								Home
							</Link>
							{user && (
								<>
									<Link
										className="block px-4 py-2 hover:bg-white/10 rounded-lg transition"
										to="/dashboard"
										onClick={closeMobileMenu}>
										Dashboard
									</Link>
									<Link
										className="block px-4 py-2 hover:bg-white/10 rounded-lg transition"
										to="/tasks"
										onClick={closeMobileMenu}>
										Tasks
									</Link>
								</>
							)}

							{user ? (
								<>
									<Link
										className="block px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition font-semibold text-center"
										to="/profile"
										onClick={closeMobileMenu}>
										{user.name}
									</Link>
								</>
							) : (
								<>
									<Link
										className="block px-4 py-2 hover:bg-white/10 rounded-lg transition text-center"
										to="/auth/login"
										onClick={closeMobileMenu}>
										Login
									</Link>
									<Link
										className="block px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-semibold text-center"
										to="/auth/register"
										onClick={closeMobileMenu}>
										Create Account
									</Link>
								</>
							)}
						</div>
					)}
				</div>
			</nav>
			{/* MAIN CONTENT */}
			<main className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
					{ready ? (
						<Routes>
							<Route
								path="/"
								element={<Home />}
							/>
							<Route
								path="/auth/login"
								element={<Login />}
							/>
							<Route
								path="/auth/register"
								element={<Register />}
							/>
							<Route
								path="/dashboard"
								element={
									user ? (
										<Dashboard user={user} />
									) : ready &&
									  !oauthInProgress &&
									  !isLoggingOutRef.current ? (
										<Navigate
											to="/auth/login"
											replace
										/>
									) : (
										<div className="flex items-center justify-center min-h-96">
											<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
										</div>
									)
								}
							/>
							<Route
								path="/tasks"
								element={
									user ? (
										<Tasks user={user} />
									) : ready &&
									  !oauthInProgress &&
									  !isLoggingOutRef.current ? (
										<Navigate
											to="/auth/login"
											replace
										/>
									) : (
										<div className="flex items-center justify-center min-h-96">
											<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
										</div>
									)
								}
							/>
							<Route
								path="/tasks/create"
								element={
									user ? (
										<CreateTask />
									) : (
										<Navigate to="/auth/login" />
									)
								}
							/>
							<Route
								path="/tasks/:id/edit"
								element={
									user ? (
										<EditTask />
									) : (
										<Navigate to="/auth/login" />
									)
								}
							/>
							<Route
								path="/tasks/:id"
								element={
									user ? (
										<TaskDetail />
									) : (
										<Navigate to="/auth/login" />
									)
								}
							/>
							<Route
								path="/profile"
								element={
									user ? (
										<Profile user={user} />
									) : ready &&
									  !oauthInProgress &&
									  !isLoggingOutRef.current ? (
										<Navigate
											to="/auth/login"
											replace
										/>
									) : (
										<div className="flex items-center justify-center min-h-96">
											<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
										</div>
									)
								}
							/>
						</Routes>
					) : (
						<div className="flex items-center justify-center min-h-96">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
						</div>
					)}
				</div>
			</main>
		</div>
	)
}

export default App
