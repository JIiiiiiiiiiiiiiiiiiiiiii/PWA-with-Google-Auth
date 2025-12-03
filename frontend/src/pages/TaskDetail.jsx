import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
	ArrowLeft,
	Edit,
	Trash2,
	CheckCircle2,
	Clock,
	Calendar,
	Tag,
	FileText,
} from "lucide-react"
import { apiGet, apiPut, apiDelete } from "../utils/api"
import { dbTasks } from "../utils/db"

export default function TaskDetail() {
	const { id } = useParams()
	const navigate = useNavigate()
	const [task, setTask] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		loadTask()
	}, [id])

	const loadTask = async () => {
		try {
			setLoading(true)
			const response = await apiGet("/api/tasks")
			let foundTask = response.data?.find((t) => t._id === id)

			// If not found in API response, try IndexedDB
			if (!foundTask) {
				try {
					foundTask = await dbTasks.get(id)
				} catch (dbError) {
					// Silent fail
				}
			}

			if (!foundTask) {
				setError("Task not found")
				return
			}

			setTask(foundTask)
		} catch (err) {
			// Try IndexedDB as fallback
			try {
				const foundTask = await dbTasks.get(id)
				if (foundTask) {
					setTask(foundTask)
				} else {
					setError("Task not found")
				}
			} catch (dbError) {
				setError("Failed to load task")
				console.error(err)
			}
		} finally {
			setLoading(false)
		}
	}

	const toggleComplete = async () => {
		// Optimistic update - update UI immediately (INSTANT)
		const updatedTask = { ...task, completed: !task.completed }
		setTask(updatedTask)

		try {
			const updated = await apiPut(`/api/tasks/${id}`, updatedTask)
			setTask(updated.data)
			// Notify Tasks page if offline (INSTANT)
			if (updated.data?._offline || !navigator.onLine) {
				window.dispatchEvent(
					new CustomEvent("task-updated-offline", {
						detail: updated.data,
					})
				)
			}
		} catch (err) {
			setTask(task)
		}
	}

	const handleDelete = async () => {
		if (
			!window.confirm(
				"Are you sure you want to delete this task? This action cannot be undone."
			)
		) {
			return
		}

		try {
			await apiDelete(`/api/tasks/${id}`)
			// Immediately notify Tasks page to update (INSTANT)
			window.dispatchEvent(
				new CustomEvent("task-deleted-offline", {
					detail: { _id: id },
				})
			)
			navigate("/tasks")
		} catch (err) {
			setError(err.response?.data?.message || "Failed to delete task")
		}
	}

	const badgeColor = {
		Football: "bg-gradient-to-r from-green-500 to-green-700",
		Basketball: "bg-gradient-to-r from-orange-400 to-orange-600",
		Tennis: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900",
		Running: "bg-gradient-to-r from-cyan-500 to-blue-600",
	}

	if (loading) {
		return (
			<div className="max-w-4xl mx-auto flex items-center justify-center min-h-96">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			</div>
		)
	}

	if (error || !task) {
		return (
			<div className="max-w-4xl mx-auto space-y-6">
				<Link
					to="/tasks"
					className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition">
					<ArrowLeft className="w-5 h-5" />
					Back to Tasks
				</Link>
				<div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
					<p className="text-red-300 text-lg">
						{error || "Task not found"}
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link
					to="/tasks"
					className="p-2 hover:bg-white/10 rounded-lg transition">
					<ArrowLeft className="w-6 h-6 text-gray-400" />
				</Link>
				<div className="flex-1">
					<h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
						Task Details
					</h1>
					<p className="text-gray-400 mt-2 text-lg">
						View and manage your training task
					</p>
				</div>
			</div>

			{/* Task Card */}
			<div className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 space-y-6">
				{/* Title and Status */}
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-4">
							{task.completed ? (
								<div className="p-3 bg-green-500/20 rounded-xl border border-green-400/30">
									<CheckCircle2 className="w-8 h-8 text-green-400" />
								</div>
							) : (
								<div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/30">
									<Clock className="w-8 h-8 text-amber-400" />
								</div>
							)}
							<div className="flex-1">
								<h2
									className={`text-3xl font-bold mb-2 ${
										task.completed
											? "text-green-200"
											: "text-white"
									}`}>
									{task.title}
								</h2>
								{task.completed && (
									<div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-400/40 rounded-full">
										<CheckCircle2 className="w-4 h-4 text-green-400" />
										<span className="text-sm font-semibold text-green-300">
											Task Completed
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
					<div className="flex gap-2">
						<button
							onClick={toggleComplete}
							className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition font-semibold text-sm shadow-lg hover:scale-105 ${
								task.completed
									? "bg-gray-600 hover:bg-gray-700 text-white"
									: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
							}`}>
							{task.completed ? (
								<>
									<Clock className="w-4 h-4" />
									Mark Pending
								</>
							) : (
								<>
									<CheckCircle2 className="w-4 h-4" />
									Mark Complete
								</>
							)}
						</button>
					</div>
				</div>

				{/* Task Info Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Category */}
					<div className="bg-white/5 rounded-xl p-4 border border-white/10">
						<div className="flex items-center gap-2 mb-2">
							<Tag className="w-5 h-5 text-gray-400" />
							<span className="text-sm text-gray-400 font-semibold">
								Category
							</span>
						</div>
						<span
							className={`inline-block px-4 py-2 text-sm rounded-full text-white font-semibold ${
								badgeColor[task.sportCategory]
							}`}>
							{task.sportCategory}
						</span>
					</div>

					{/* Status */}
					<div className="bg-white/5 rounded-xl p-4 border border-white/10">
						<div className="flex items-center gap-2 mb-2">
							{task.completed ? (
								<CheckCircle2 className="w-5 h-5 text-gray-400" />
							) : (
								<Clock className="w-5 h-5 text-gray-400" />
							)}
							<span className="text-sm text-gray-400 font-semibold">
								Status
							</span>
						</div>
						<span
							className={`text-lg font-bold ${
								task.completed
									? "text-green-400"
									: "text-amber-400"
							}`}>
							{task.completed ? "Completed" : "Pending"}
						</span>
					</div>

					{/* Created Date */}
					{task.createdAt && (
						<div className="bg-white/5 rounded-xl p-4 border border-white/10">
							<div className="flex items-center gap-2 mb-2">
								<Calendar className="w-5 h-5 text-gray-400" />
								<span className="text-sm text-gray-400 font-semibold">
									Created
								</span>
							</div>
							<span className="text-white font-semibold">
								{new Date(task.createdAt).toLocaleDateString(
									"en-US",
									{
										year: "numeric",
										month: "long",
										day: "numeric",
									}
								)}
							</span>
						</div>
					)}

					{/* Due Date */}
					{task.dueDate && (
						<div className="bg-white/5 rounded-xl p-4 border border-white/10">
							<div className="flex items-center gap-2 mb-2">
								<Calendar className="w-5 h-5 text-gray-400" />
								<span className="text-sm text-gray-400 font-semibold">
									Due Date
								</span>
							</div>
							<span className="text-white font-semibold">
								{new Date(task.dueDate).toLocaleDateString(
									"en-US",
									{
										year: "numeric",
										month: "long",
										day: "numeric",
									}
								)}
							</span>
						</div>
					)}
				</div>

				{/* Description */}
				{task.description && (
					<div className="bg-white/5 rounded-xl p-4 border border-white/10">
						<div className="flex items-center gap-2 mb-3">
							<FileText className="w-5 h-5 text-gray-400" />
							<span className="text-sm text-gray-400 font-semibold">
								Description
							</span>
						</div>
						<p className="text-white leading-relaxed whitespace-pre-wrap">
							{task.description}
						</p>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-4 pt-4 border-t border-white/10">
					<Link
						to={`/tasks/${id}/edit`}
						className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition font-semibold shadow-lg">
						<Edit className="w-5 h-5" />
						Edit Task
					</Link>
					<button
						onClick={handleDelete}
						className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition font-semibold shadow-lg">
						<Trash2 className="w-5 h-5" />
						Delete Task
					</button>
				</div>
			</div>
		</div>
	)
}
