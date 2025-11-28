import React, { useEffect, useState } from "react"
import { Routes, Route, Navigate, Link } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import { apiGet } from "./utils/api"

function App() {
	const [user, setUser] = useState(null)
	const [ready, setReady] = useState(false)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	useEffect(() => {
		apiGet("/api/auth/me")
			.then((r) => setUser(r.data.user))
			.catch(() => setUser(null))
			.finally(() => setReady(true))
	}, [])

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
							<span className="hidden sm:inline">
								Sports Yarnia
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
								<Link
									className="hover:text-yellow-300 transition duration-200"
									to="/dashboard">
									Dashboard
								</Link>
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
								<Link
									className="block px-4 py-2 hover:bg-white/10 rounded-lg transition"
									to="/dashboard"
									onClick={closeMobileMenu}>
									Dashboard
								</Link>
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
									) : (
										<Navigate to="/auth/login" />
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
