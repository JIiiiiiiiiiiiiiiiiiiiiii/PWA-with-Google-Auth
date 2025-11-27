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

	useEffect(() => {
		apiGet("/api/auth/me")
			.then((r) => setUser(r.data.user))
			.catch(() => setUser(null))
			.finally(() => setReady(true))
	}, [])

	return (
		<div className="min-h-screen bg-gray-100">
			{/* NAVBAR */}
			<nav className="bg-blue-700 text-white px-8 py-4 shadow-md">
				<div className="max-w-6xl mx-auto flex justify-between items-center">
					<div className="text-2xl font-bold flex items-center gap-2">
						Sports Yarn
					</div>

					<div className="space-x-6 font-medium">
						<Link
							className="hover:underline"
							to="/">
							Home
						</Link>
						<Link
							className="hover:underline"
							to="/dashboard">
							Dashboard
						</Link>

						{user ? (
							<Link
								className="hover:underline"
								to="/profile">
								{user.name}
							</Link>
						) : (
							<>
								<Link
									className="hover:underline"
									to="/auth/login">
									Login
								</Link>
								<Link
									className="hover:underline"
									to="/auth/register">
									Register
								</Link>
							</>
						)}
					</div>
				</div>
			</nav>

			{/* ROUTES */}
			<div className="max-w-6xl mx-auto mt-8 px-4">
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
				) : null}
			</div>
		</div>
	)
}

export default App
