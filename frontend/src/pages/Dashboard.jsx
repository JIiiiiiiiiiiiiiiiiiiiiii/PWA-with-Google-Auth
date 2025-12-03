import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Trophy, Activity, CheckCircle2, Clock, TrendingUp, Plus, ArrowRight, Target, Calendar, Zap } from "lucide-react"
import { apiGet } from "../utils/api"
import { dbTasks } from "../utils/db"
import { io } from "socket.io-client"

let socket

export default function Dashboard({ user }) {
	const [tasks, setTasks] = useState([])
	const [stats, setStats] = useState({
		total: 0,
		completed: 0,
		pending: 0,
		completionRate: 0
	})

	// Prevent multiple simultaneous loadTasks calls
	let isLoadingTasks = false
	const loadTasks = async () => {
		// Prevent infinite loops
		if (isLoadingTasks) {
			return
		}
		isLoadingTasks = true
		try {
			// Try API first (will fallback to IndexedDB if offline)
			const response = await apiGet("/api/tasks")
			const allTasks = response.data || []
			setTasks(allTasks)
			
			const completed = allTasks.filter(t => t.completed).length
			const pending = allTasks.filter(t => !t.completed).length
			const completionRate = allTasks.length > 0 
				? Math.round((completed / allTasks.length) * 100) 
				: 0

			setStats({
				total: allTasks.length,
				completed,
				pending,
				completionRate
			})
		} catch (error) {
			try {
				const cachedTasks = await dbTasks.getAll()
				setTasks(cachedTasks || [])
				const completed = cachedTasks.filter(t => t.completed).length
				const pending = cachedTasks.filter(t => !t.completed).length
				const completionRate = cachedTasks.length > 0 
					? Math.round((completed / cachedTasks.length) * 100) 
					: 0
				setStats({
					total: cachedTasks.length,
					completed,
					pending,
					completionRate
				})
			} catch (dbError) {
				setTasks([])
				setStats({
					total: 0,
					completed: 0,
					pending: 0,
				completionRate: 0
			})
		} finally {
			isLoadingTasks = false
		}
	}
	}

	useEffect(() => {
		// Don't proceed if user is not available
		if (!user || !user._id) {
			return
		}
		
		loadTasks()

		// Socket.io only when online (errors suppressed globally in main.jsx)
		if (navigator.onLine) {
			try {
				socket = io(import.meta.env.VITE_API_URL, { 
					withCredentials: true,
					transports: ['websocket', 'polling'],
					timeout: 2000,
					reconnection: false
				})
				
				socket.on("connect", () => {
					if (user?._id) {
						socket.emit("joinRoom", user._id)
					}
				})
				
				socket.on("task-created", () => loadTasks())
				socket.on("task-updated", () => loadTasks())
				socket.on("task-deleted", () => loadTasks())
				
				socket.on("connect_error", () => {
					// Backend is down - expected, errors suppressed globally
					if (socket) {
						try {
							socket.disconnect()
						} catch (error) {
							// Suppress disconnect errors
						}
						socket = null
					}
				})
				
				// Connect (errors will be suppressed by global handler in main.jsx)
				socket.connect()
			} catch (error) {
				// Suppress socket.io errors when backend is down
			}
		}

		// Online/offline listeners
		const handleOnline = () => {
			loadTasks()
			if (!socket) {
				try {
					socket = io(import.meta.env.VITE_API_URL, { 
						withCredentials: true,
						transports: ['websocket', 'polling'],
						timeout: 2000,
						reconnection: false
					})
					
					socket.on("connect", () => {
						if (user?._id) {
							socket.emit("joinRoom", user._id)
						}
					})
					
					socket.on("task-created", () => loadTasks())
					socket.on("task-updated", () => loadTasks())
					socket.on("task-deleted", () => loadTasks())
					
					socket.on("connect_error", () => {
					// Backend is down - expected, errors suppressed globally
					if (socket) {
						try {
							socket.disconnect()
						} catch (error) {
							// Suppress disconnect errors
						}
						socket = null
					}
					})
					
					// Connect (errors will be suppressed by global handler in main.jsx)
					socket.connect()
				} catch (error) {
					// Suppress socket.io errors
				}
			}
		}
		const handleOffline = () => {
			if (socket) {
				try {
					socket.disconnect()
				} catch (error) {
					// Suppress disconnect errors
				}
				socket = null
			}
		}

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		// Listen for background refresh events (debounced to prevent infinite loops)
		let refreshTimeout = null
		const handleTasksRefreshed = (event) => {
			// Debounce: only reload if not already reloading
			if (refreshTimeout) {
				clearTimeout(refreshTimeout)
			}
			refreshTimeout = setTimeout(() => {
				if (event.detail) {
					loadTasks()
				}
			}, 500) // 500ms debounce
		}
		window.addEventListener('tasks-refreshed', handleTasksRefreshed)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
			window.removeEventListener('tasks-refreshed', handleTasksRefreshed)
			if (refreshTimeout) {
				clearTimeout(refreshTimeout)
			}
			if (socket) {
				try {
					socket.disconnect()
				} catch (error) {
					// Suppress disconnect errors
				}
				socket = null
			}
		}
	}, [user?._id])

	const recentTasks = tasks.slice(0, 5)
	const categoryCounts = tasks.reduce((acc, task) => {
		acc[task.sportCategory] = (acc[task.sportCategory] || 0) + 1
		return acc
	}, {})

	const badgeColor = {
		Football: "bg-gradient-to-r from-green-500 to-green-700",
		Basketball: "bg-gradient-to-r from-orange-400 to-orange-600",
		Tennis: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900",
		Running: "bg-gradient-to-r from-cyan-500 to-blue-600",
	}

	return (
		<div className="max-w-7xl mx-auto space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-3 text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
						<Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400" />
						Dashboard
					</h1>
					<p className="text-gray-400 mt-2 text-lg">
						Welcome back, {user.name}! Here's your training overview.
					</p>
				</div>
				<Link
					to="/tasks/create"
					className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all font-bold">
					<Plus className="w-5 h-5" />
					New Task
				</Link>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Total Tasks */}
				<div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-lg border border-blue-400/20 rounded-2xl p-6 hover:shadow-xl transition-all">
					<div className="flex items-center justify-between mb-4">
						<div className="p-3 bg-blue-500/20 rounded-xl">
							<Activity className="w-6 h-6 text-blue-400" />
						</div>
						<TrendingUp className="w-5 h-5 text-blue-400" />
					</div>
					<div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
					<div className="text-sm text-gray-400">Total Tasks</div>
				</div>

				{/* Completed Tasks */}
				<div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-lg border border-green-400/20 rounded-2xl p-6 hover:shadow-xl transition-all">
					<div className="flex items-center justify-between mb-4">
						<div className="p-3 bg-green-500/20 rounded-xl">
							<CheckCircle2 className="w-6 h-6 text-green-400" />
						</div>
						<TrendingUp className="w-5 h-5 text-green-400" />
					</div>
					<div className="text-3xl font-bold text-white mb-1">{stats.completed}</div>
					<div className="text-sm text-gray-400">Completed</div>
				</div>

				{/* Pending Tasks */}
				<div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-lg border border-amber-400/20 rounded-2xl p-6 hover:shadow-xl transition-all">
					<div className="flex items-center justify-between mb-4">
						<div className="p-3 bg-amber-500/20 rounded-xl">
							<Clock className="w-6 h-6 text-amber-400" />
						</div>
						<Target className="w-5 h-5 text-amber-400" />
					</div>
					<div className="text-3xl font-bold text-white mb-1">{stats.pending}</div>
					<div className="text-sm text-gray-400">Pending</div>
				</div>

				{/* Completion Rate */}
				<div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-lg border border-purple-400/20 rounded-2xl p-6 hover:shadow-xl transition-all">
					<div className="flex items-center justify-between mb-4">
						<div className="p-3 bg-purple-500/20 rounded-xl">
							<Target className="w-6 h-6 text-purple-400" />
						</div>
						<Zap className="w-5 h-5 text-purple-400" />
					</div>
					<div className="text-3xl font-bold text-white mb-1">{stats.completionRate}%</div>
					<div className="text-sm text-gray-400">Completion Rate</div>
				</div>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Recent Tasks - Takes 2 columns */}
				<div className="lg:col-span-2 bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-white flex items-center gap-2">
							<Clock className="w-6 h-6 text-blue-400" />
							Recent Tasks
						</h2>
						<Link
							to="/tasks"
							className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition text-sm font-semibold">
							View All
							<ArrowRight className="w-4 h-4" />
						</Link>
					</div>

					{recentTasks.length === 0 ? (
						<div className="text-center py-12">
							<Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-400 mb-4">No tasks yet</p>
							<Link
								to="/tasks/create"
								className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
								<Plus className="w-4 h-4" />
								Create Your First Task
							</Link>
						</div>
					) : (
						<div className="space-y-3">
							{recentTasks.map((task) => (
								<Link
									key={task._id}
									to={`/tasks/${task._id}`}
									className={`block relative border-2 rounded-xl p-4 transition-all group ${
										task.completed
											? "bg-green-500/10 hover:bg-green-500/15 border-green-400/30"
											: "bg-white/5 hover:bg-white/10 border-white/10"
									}`}>
									{/* Completion indicator - top right */}
									{task.completed && (
										<div className="absolute top-3 right-3">
											<div className="w-5 h-5 rounded-full bg-green-500/30 border border-green-400/50 flex items-center justify-center">
												<CheckCircle2 className="w-3 h-3 text-green-300" />
											</div>
										</div>
									)}
									<div className="flex items-start gap-3 pr-8">
										{task.completed ? (
											<div className="p-2 bg-green-500/20 rounded-lg border border-green-400/40 flex-shrink-0">
												<CheckCircle2 className="w-4 h-4 text-green-400" />
											</div>
										) : (
											<div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30 flex-shrink-0">
												<Clock className="w-4 h-4 text-amber-400" />
											</div>
										)}
										<div className="flex-1 min-w-0">
											<h3 className={`font-semibold mb-1 transition ${
												task.completed 
													? "text-green-100 group-hover:text-green-50" 
													: "text-white group-hover:text-blue-400"
											}`}>
												{task.title}
											</h3>
											<div className="flex items-center gap-2 flex-wrap">
												<span className={`px-2.5 py-1 text-xs rounded-full text-white font-medium ${
													badgeColor[task.sportCategory]
												}`}>
													{task.sportCategory}
												</span>
												{task.createdAt && (
													<span className="text-xs text-gray-400 flex items-center gap-1">
														<Calendar className="w-3 h-3" />
														{new Date(task.createdAt).toLocaleDateString()}
													</span>
												)}
											</div>
										</div>
										<ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition flex-shrink-0" />
									</div>
								</Link>
							))}
						</div>
					)}
				</div>

				{/* Category Breakdown */}
				<div className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
					<h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
						<Target className="w-6 h-6 text-purple-400" />
						By Category
					</h2>

					{Object.keys(categoryCounts).length === 0 ? (
						<div className="text-center py-8">
							<p className="text-gray-400 text-sm">No categories yet</p>
						</div>
					) : (
						<div className="space-y-4">
							{Object.entries(categoryCounts).map(([category, count]) => (
								<div key={category} className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<span className={`px-3 py-1.5 text-sm rounded-full text-white font-semibold ${
											badgeColor[category]
										}`}>
											{category}
										</span>
									</div>
									<div className="text-white font-bold">{count}</div>
								</div>
							))}
						</div>
					)}

					{/* Quick Actions */}
					<div className="mt-6 pt-6 border-t border-white/10">
						<h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
						<div className="space-y-2">
							<Link
								to="/tasks/create"
								className="flex items-center gap-2 w-full px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 transition">
								<Plus className="w-4 h-4" />
								Create New Task
							</Link>
							<Link
								to="/tasks"
								className="flex items-center gap-2 w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition">
								<Activity className="w-4 h-4" />
								View All Tasks
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Motivational Section */}
			{stats.total > 0 && (
				<div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-lg border border-blue-400/20 rounded-2xl p-6">
					<div className="flex items-center gap-4">
						<div className="p-4 bg-blue-500/20 rounded-xl">
							<Zap className="w-8 h-8 text-blue-400" />
						</div>
						<div className="flex-1">
							<h3 className="text-xl font-bold text-white mb-1">Keep Going! 🚀</h3>
							<p className="text-gray-300">
								{stats.completed === stats.total 
									? "Amazing! You've completed all your tasks. Time to set new goals!"
									: `You're ${stats.completionRate}% of the way there. ${stats.pending} task${stats.pending !== 1 ? 's' : ''} remaining!`
								}
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
