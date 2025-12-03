import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { User, Mail, BarChart3, LogOut, CheckCircle2 } from "lucide-react"
import { apiPost, apiGet } from "../utils/api"
import { dbTasks } from "../utils/db"

export default function Profile({ user }) {
	const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
	const [isOnline, setIsOnline] = useState(navigator.onLine)
	const navigate = useNavigate()

	useEffect(() => {
		const loadStats = async () => {
			try {
				const response = await apiGet("/api/tasks")
				const tasks = response.data || []
				setTaskStats({
					total: tasks.length,
					completed: tasks.filter((t) => t.completed).length,
				})
			} catch (error) {
				// Fallback to IndexedDB
				try {
					const tasks = await dbTasks.getAll()
					setTaskStats({
						total: tasks.length,
						completed: tasks.filter((t) => t.completed).length,
					})
				} catch (dbError) {
					setTaskStats({ total: 0, completed: 0 })
				}
			}
		}
		loadStats()

		const handleOnline = () => setIsOnline(true)
		const handleOffline = () => setIsOnline(false)

		window.addEventListener("online", handleOnline)
		window.addEventListener("offline", handleOffline)

		return () => {
			window.removeEventListener("online", handleOnline)
			window.removeEventListener("offline", handleOffline)
		}
	}, [])

	const logout = async () => {
		sessionStorage.setItem("isLoggingOut", "true")
		window.dispatchEvent(new CustomEvent("user-logged-out"))

		try {
			const { dbAuth, dbTasks, syncQueue } = await import("../utils/db")
			await Promise.all([
				dbAuth.clear(),
				dbTasks.clear(),
				syncQueue
					.getAll()
					.then((pending) =>
						Promise.all(
							pending.map((op) => syncQueue.delete(op.id))
						)
					),
			])
		} catch (error) {
			// Silent fail
		}

		if (navigator.onLine) {
			try {
				await apiPost("/api/auth/logout")
				await new Promise((resolve) => setTimeout(resolve, 500))

				const { apiGet } = await import("../utils/api")
				let verified = false
				for (let i = 0; i < 10; i++) {
					try {
						const response = await apiGet("/api/auth/me")
						if (!response.data?.user) {
							await new Promise((resolve) =>
								setTimeout(resolve, 200)
							)
							const doubleCheck = await apiGet("/api/auth/me")
							if (!doubleCheck.data?.user) {
								verified = true
								break
							}
						}
						if (i < 9) {
							await apiPost("/api/auth/logout")
							await new Promise((resolve) =>
								setTimeout(resolve, 500)
							)
						}
					} catch (verifyError) {
						verified = true
						break
					}
				}

				if (verified) {
					sessionStorage.removeItem("isLoggingOut")
				} else {
					setTimeout(() => {
						sessionStorage.removeItem("isLoggingOut")
					}, 30000)
				}
			} catch (error) {
				// Silent fail
			}
		}

		navigate("/", { replace: true })
	}

	const completionRate =
		taskStats.total > 0
			? Math.round((taskStats.completed / taskStats.total) * 100)
			: 0

	return (
		<div className="min-h-[calc(100vh-150px)] flex items-center justify-center px-4 py-12">
			<div className="w-full max-w-2xl">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mb-4 border border-blue-400/30">
						<User className="w-12 h-12 text-blue-300" />
					</div>
					<h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">
						My Profile
					</h2>
					<p className="text-gray-400">
						Manage your account and view your stats
					</p>
				</div>

				{/* Main Profile Card */}
				<div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8 mb-6">
					<div className="space-y-6">
						{/* User Info */}
						<div className="bg-white/5 rounded-xl p-5 border border-white/10">
							<label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
								Full Name
							</label>
							<p className="text-xl font-bold text-white flex items-center gap-2">
								<User className="w-5 h-5 text-gray-400" />
								{user.name || "Not set"}
							</p>
						</div>

						<div className="bg-white/5 rounded-xl p-5 border border-white/10">
							<label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
								Email Address
							</label>
							<p className="text-lg font-semibold text-white break-all flex items-center gap-2">
								<Mail className="w-5 h-5 text-gray-400" />
								{user.email}
							</p>
						</div>

						{user.googleId && (
							<div className="bg-green-500/10 rounded-xl p-5 border border-green-400/20">
								<label className="block text-xs font-semibold text-green-300 mb-2 uppercase tracking-wide">
									Authentication Method
								</label>
								<p className="text-lg font-semibold text-green-200 flex items-center gap-2">
									<svg
										className="w-5 h-5"
										viewBox="0 0 24 24">
										<path
											fill="#34A853"
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										/>
										<path
											fill="#4285F4"
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										/>
									</svg>
									Google OAuth Connected
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Stats Card */}
				<div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-400/20 shadow-2xl rounded-2xl p-8 mb-6">
					<h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
						<BarChart3 className="w-6 h-6 text-blue-400" />
						Training Statistics
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center">
							<div className="text-3xl font-bold text-blue-400 mb-2">
								{taskStats.total}
							</div>
							<div className="text-sm text-gray-300">
								Total Tasks
							</div>
						</div>
						<div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center">
							<div className="text-3xl font-bold text-green-400 mb-2">
								{taskStats.completed}
							</div>
							<div className="text-sm text-gray-300">
								Completed
							</div>
						</div>
						<div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center">
							<div className="text-3xl font-bold text-purple-400 mb-2">
								{completionRate}%
							</div>
							<div className="text-sm text-gray-300">
								Completion Rate
							</div>
						</div>
					</div>
				</div>

				{/* Account Info */}
				<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
					<div className="flex items-center justify-between flex-wrap gap-4">
						<div>
							<label className="block text-xs font-semibold text-gray-400 mb-1">
								Member Since
							</label>
							<p className="text-white font-semibold">
								{new Date(user.createdAt).toLocaleDateString(
									"en-US",
									{
										year: "numeric",
										month: "long",
										day: "numeric",
									}
								)}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<div
								className={`w-3 h-3 rounded-full ${
									isOnline ? "bg-green-400" : "bg-amber-400"
								} animate-pulse`}></div>
							<span className="text-sm text-gray-300">
								{isOnline ? "Online" : "Offline"}
							</span>
						</div>
					</div>
				</div>

				{/* Logout Button */}
				<button
					onClick={logout}
					className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-red-500/50 hover:scale-[1.02] transition-all font-bold text-lg">
					<LogOut className="w-5 h-5" />
					Logout
				</button>
			</div>
		</div>
	)
}
