import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
	Activity,
	Plus,
	CheckCircle2,
	Clock,
	Edit,
	Trash2,
	Filter,
	Search,
	X,
} from "lucide-react"
import { apiGet, apiPut, apiDelete } from "../utils/api"
import { dbTasks } from "../utils/db"
import { syncManager, syncQueue } from "../utils/sync"
import { io } from "socket.io-client"

let socket

export default function Tasks({ user }) {
	const [tasks, setTasks] = useState([])
	const [filteredTasks, setFilteredTasks] = useState([])
	const [searchTerm, setSearchTerm] = useState("")
	const [filterCategory, setFilterCategory] = useState("All")
	const [filterStatus, setFilterStatus] = useState("All")
	const [loading, setLoading] = useState(true)
	const [isOnline, setIsOnline] = useState(navigator.onLine)
	const [pendingCount, setPendingCount] = useState(0)

	const checkPendingOperations = async () => {
		try {
			const pending = await syncQueue.getPending()
			setPendingCount(pending?.length || 0)
		} catch (error) {
			// Silent fail
		}
	}

	useEffect(() => {
		// Don't proceed if user is not available
		if (!user || !user._id) {
			setLoading(false) // Stop loading if no user
			return
		}

		loadTasks(true) // Pass true to show loading state

		// Socket.io only when online (errors suppressed globally in main.jsx)
		if (navigator.onLine) {
			try {
				socket = io(import.meta.env.VITE_API_URL, {
					withCredentials: true,
					transports: ["websocket", "polling"],
					timeout: 2000,
					reconnection: false,
					autoConnect: false,
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

		// Online/offline listeners - auto-sync when online
		const handleOnline = () => {
			setIsOnline(true)
			loadTasks()
			// Auto-sync when coming back online
			if (navigator.onLine) {
				setTimeout(() => syncManager.sync(), 500)
			}
			if (!socket && user?._id) {
				try {
					socket = io(import.meta.env.VITE_API_URL, {
						withCredentials: true,
						transports: ["websocket", "polling"],
						timeout: 2000,
						reconnection: false,
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
			setIsOnline(false)
			if (socket) {
				try {
					socket.disconnect()
				} catch (error) {
					// Suppress disconnect errors
				}
				socket = null
			}
		}

		window.addEventListener("online", handleOnline)
		window.addEventListener("offline", handleOffline)

		// Sync manager listener - auto-sync when online
		const handleSync = (event) => {
			if (
				event.type === "sync-complete" ||
				event.type === "tasks-refreshed"
			) {
				loadTasks()
				checkPendingOperations()
			} else if (event.type === "sync-error") {
				console.error("Sync error:", event.error)
			}
		}
		syncManager.onSync(handleSync)

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
		window.addEventListener("tasks-refreshed", handleTasksRefreshed)

		// Check pending operations
		checkPendingOperations()

		// Listen for offline task creation/update events - INSTANT updates
		const handleOfflineTaskCreated = (event) => {
			const newTask = event.detail
			if (newTask) {
				// Add task immediately to UI (INSTANT)
				setTasks((prevTasks) => {
					// Check if task already exists (avoid duplicates)
					if (prevTasks.find((t) => t._id === newTask._id)) {
						return prevTasks
					}
					return [...prevTasks, newTask]
				})
			} else {
				// Fallback: reload from IndexedDB
				loadTasks()
			}
			checkPendingOperations()
		}
		const handleOfflineTaskUpdated = (event) => {
			const updatedTask = event.detail
			if (updatedTask) {
				// Update task immediately in UI (INSTANT)
				setTasks((prevTasks) =>
					prevTasks.map((t) =>
						t._id === updatedTask._id ? updatedTask : t
					)
				)
			} else {
				// Fallback: reload from IndexedDB
				loadTasks()
			}
			checkPendingOperations()
		}
		const handleOfflineTaskDeleted = (event) => {
			const deletedTaskId = event.detail?._id || event.detail
			if (deletedTaskId) {
				// Remove task immediately from UI (INSTANT)
				setTasks((prevTasks) =>
					prevTasks.filter((t) => t._id !== deletedTaskId)
				)
			} else {
				// Fallback: reload from IndexedDB
				loadTasks()
			}
			checkPendingOperations()
		}
		window.addEventListener(
			"task-created-offline",
			handleOfflineTaskCreated
		)
		window.addEventListener(
			"task-updated-offline",
			handleOfflineTaskUpdated
		)
		window.addEventListener(
			"task-deleted-offline",
			handleOfflineTaskDeleted
		)

		return () => {
			window.removeEventListener("online", handleOnline)
			window.removeEventListener("offline", handleOffline)
			window.removeEventListener(
				"task-created-offline",
				handleOfflineTaskCreated
			)
			window.removeEventListener(
				"task-updated-offline",
				handleOfflineTaskUpdated
			)
			window.removeEventListener(
				"task-deleted-offline",
				handleOfflineTaskDeleted
			)
			window.removeEventListener("tasks-refreshed", handleTasksRefreshed)
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

	useEffect(() => {
		filterTasks()
	}, [tasks, searchTerm, filterCategory, filterStatus])

	// Prevent multiple simultaneous loadTasks calls
	let isLoadingTasks = false
	const loadTasks = async (showLoading = false) => {
		// Prevent infinite loops
		if (isLoadingTasks) {
			return
		}
		isLoadingTasks = true

		try {
			if (showLoading) {
				setLoading(true)
			}
			// Try to load from API (will fallback to IndexedDB if offline)
			const response = await apiGet("/api/tasks")
			setTasks(response.data || [])

			// Update pending count
			checkPendingOperations()
		} catch (error) {
			try {
				const cachedTasks = await dbTasks.getAll()
				setTasks(cachedTasks || [])
			} catch (dbError) {
				setTasks([])
			}
		} finally {
			if (showLoading) setLoading(false)
			isLoadingTasks = false
		}
	}

	const filterTasks = () => {
		let filtered = [...tasks]

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter((task) =>
				task.title.toLowerCase().includes(searchTerm.toLowerCase())
			)
		}

		// Category filter
		if (filterCategory !== "All") {
			filtered = filtered.filter(
				(task) => task.sportCategory === filterCategory
			)
		}

		// Status filter
		if (filterStatus === "Completed") {
			filtered = filtered.filter((task) => task.completed)
		} else if (filterStatus === "Pending") {
			filtered = filtered.filter((task) => !task.completed)
		}

		setFilteredTasks(filtered)
	}

	const toggleComplete = async (task) => {
		// Optimistic update - update UI immediately (INSTANT - no delay)
		const newCompletedStatus = !task.completed
		const updatedTask = {
			...task,
			completed: newCompletedStatus,
			updatedAt: new Date().toISOString(),
		}
		setTasks((prevTasks) =>
			prevTasks.map((t) => (t._id === task._id ? updatedTask : t))
		)

		try {
			// Only send the completed field to update (not the whole task object)
			const response = await apiPut(`/api/tasks/${task._id}`, {
				completed: newCompletedStatus,
			})

			// Update state with response data
			if (response.data) {
				setTasks((prevTasks) =>
					prevTasks.map((t) =>
						t._id === task._id ? response.data : t
					)
				)
				// Dispatch event for instant UI update
				window.dispatchEvent(
					new CustomEvent("task-updated-offline", {
						detail: response.data,
					})
				)
			}
			checkPendingOperations()
		} catch (error) {
			loadTasks()
		}
	}

	const deleteTask = async (taskId) => {
		if (!window.confirm("Are you sure you want to delete this task?"))
			return

		// Optimistic update - remove from UI immediately (INSTANT - no delay)
		const taskToDelete = tasks.find((t) => t._id === taskId)
		setTasks((prevTasks) => prevTasks.filter((t) => t._id !== taskId))

		try {
			// This will delete from IndexedDB if offline (non-blocking)
			await apiDelete(`/api/tasks/${taskId}`)
			// Task already removed from UI, just ensure consistency
			checkPendingOperations()
		} catch (error) {
			console.error("Failed to delete task:", error)
			// Revert on error - restore task
			if (taskToDelete) {
				setTasks((prevTasks) => [...prevTasks, taskToDelete])
			}
			loadTasks() // Don't await - non-blocking
		}
	}

	const badgeColor = {
		Football: "bg-gradient-to-r from-green-500 to-green-700",
		Basketball: "bg-gradient-to-r from-orange-400 to-orange-600",
		Tennis: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900",
		Running: "bg-gradient-to-r from-cyan-500 to-blue-600",
	}

	const categories = ["All", "Football", "Basketball", "Tennis", "Running"]
	const statuses = ["All", "Pending", "Completed"]

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto flex items-center justify-center min-h-96">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			</div>
		)
	}

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex-1">
					<h1 className="flex items-center gap-3 text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
						<Activity className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400" />
						My Tasks
					</h1>
					<p className="text-gray-400 text-lg">
						Manage all your training tasks and track your progress
						{!isOnline &&
							" (Offline mode - changes will sync when online)"}
					</p>
				</div>
				<Link
					to="/tasks/create"
					className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all font-bold">
					<Plus className="w-5 h-5" />
					New Task
				</Link>
			</div>

			{/* Filters */}
			<div className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Search tasks..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition"
						/>
						{searchTerm && (
							<button
								onClick={() => setSearchTerm("")}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
								<X className="w-4 h-4" />
							</button>
						)}
					</div>

					{/* Category Filter */}
					<div className="relative">
						<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<select
							value={filterCategory}
							onChange={(e) => setFilterCategory(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition cursor-pointer appearance-none">
							{categories.map((cat) => (
								<option
									key={cat}
									value={cat}
									className="bg-slate-800">
									{cat}
								</option>
							))}
						</select>
					</div>

					{/* Status Filter */}
					<div className="relative">
						<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition cursor-pointer appearance-none">
							{statuses.map((status) => (
								<option
									key={status}
									value={status}
									className="bg-slate-800">
									{status}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Active Filters */}
				{(searchTerm ||
					filterCategory !== "All" ||
					filterStatus !== "All") && (
					<div className="mt-4 flex items-center gap-2 flex-wrap">
						<span className="text-sm text-gray-400">
							Active filters:
						</span>
						{searchTerm && (
							<span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm">
								Search: "{searchTerm}"
							</span>
						)}
						{filterCategory !== "All" && (
							<span className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-300 text-sm">
								{filterCategory}
							</span>
						)}
						{filterStatus !== "All" && (
							<span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-amber-300 text-sm">
								{filterStatus}
							</span>
						)}
						<button
							onClick={() => {
								setSearchTerm("")
								setFilterCategory("All")
								setFilterStatus("All")
							}}
							className="px-3 py-1 bg-red-500/20 border border-red-400/30 rounded-full text-red-300 text-sm hover:bg-red-500/30 transition">
							Clear All
						</button>
					</div>
				)}
			</div>

			{/* Tasks List */}
			<div className="space-y-4">
				{filteredTasks.length === 0 ? (
					<div className="text-center py-16 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
						<Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-300 text-xl font-semibold mb-2">
							{searchTerm ||
							filterCategory !== "All" ||
							filterStatus !== "All"
								? "No tasks match your filters"
								: "No tasks yet!"}
						</p>
						<p className="text-gray-400 text-sm mb-6">
							{searchTerm ||
							filterCategory !== "All" ||
							filterStatus !== "All"
								? "Try adjusting your search or filters"
								: "Create your first training task to get started on your sports journey."}
						</p>
						{!searchTerm &&
							filterCategory === "All" &&
							filterStatus === "All" && (
								<Link
									to="/tasks/create"
									className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-blue-500/50 transition font-semibold">
									<Plus className="w-5 h-5" />
									Create Your First Task
								</Link>
							)}
					</div>
				) : (
					filteredTasks.map((task) => (
						<div
							key={task._id}
							className={`relative bg-gradient-to-r ${
								task.completed
									? "from-green-500/10 to-green-600/5 border-green-400/30"
									: "from-white/10 to-white/5 border-white/20"
							} backdrop-blur-lg border-2 p-6 rounded-xl hover:shadow-xl transition-all group`}>
							<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
								<div className="flex-1">
									<div className="flex items-start gap-3">
										{task.completed ? (
											<div className="p-2.5 bg-green-500/20 rounded-lg border border-green-400/40 flex-shrink-0">
												<CheckCircle2 className="w-5 h-5 text-green-400" />
											</div>
										) : (
											<div className="p-2.5 bg-amber-500/20 rounded-lg border border-amber-400/30 flex-shrink-0">
												<Clock className="w-5 h-5 text-amber-400" />
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-2 flex-wrap">
												<h3
													className={`text-xl font-bold ${
														task.completed
															? "text-green-100"
															: "text-white"
													}`}>
													{task.title}
												</h3>
												{/* Completion Badge - Next to Title */}
												{task.completed && (
													<div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/30 border border-green-400/50 rounded-full backdrop-blur-sm">
														<CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
														<span className="text-xs font-semibold text-green-200">
															Completed
														</span>
													</div>
												)}
											</div>

											<div className="flex items-center gap-3 flex-wrap">
												<span
													className={`px-4 py-1.5 text-sm rounded-full text-white font-semibold shadow-lg ${
														badgeColor[
															task.sportCategory
														]
													}`}>
													{task.sportCategory}
												</span>
												{task.createdAt && (
													<span className="text-xs text-gray-400">
														Created{" "}
														{new Date(
															task.createdAt
														).toLocaleDateString()}
													</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Actions */}
								<div className="flex gap-2 flex-wrap sm:flex-nowrap sm:ml-auto">
									<button
										onClick={() => toggleComplete(task)}
										className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition font-semibold text-sm shadow-lg hover:scale-105 ${
											task.completed
												? "bg-gray-600/80 hover:bg-gray-700 text-white"
												: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
										}`}>
										{task.completed ? (
											<>
												<X className="w-4 h-4" />
												Undo
											</>
										) : (
											<>
												<CheckCircle2 className="w-4 h-4" />
												Complete
											</>
										)}
									</button>

									<Link
										to={`/tasks/${task._id}/edit`}
										className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition font-semibold text-sm shadow-lg hover:scale-105">
										<Edit className="w-4 h-4" />
										Edit
									</Link>

									<button
										onClick={() => deleteTask(task._id)}
										className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition font-semibold text-sm shadow-lg hover:scale-105">
										<Trash2 className="w-4 h-4" />
										Delete
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* Stats Summary */}
			{filteredTasks.length > 0 && (
				<div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-lg border border-blue-400/20 rounded-2xl p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-gray-400 text-sm mb-1">
								Showing
							</p>
							<p className="text-2xl font-bold text-white">
								{filteredTasks.length} of {tasks.length} task
								{filteredTasks.length !== 1 ? "s" : ""}
							</p>
						</div>
						<div className="text-right">
							<p className="text-gray-400 text-sm mb-1">
								Completed
							</p>
							<p className="text-2xl font-bold text-green-400">
								{
									filteredTasks.filter((t) => t.completed)
										.length
								}
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
