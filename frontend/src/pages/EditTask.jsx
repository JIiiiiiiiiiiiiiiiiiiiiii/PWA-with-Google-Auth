import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Edit, ArrowLeft, Save, Calendar, Trash2 } from "lucide-react"
import { apiGet, apiPut, apiDelete } from "../utils/api"
import { dbTasks } from "../utils/db"

export default function EditTask() {
	const navigate = useNavigate()
	const { id } = useParams()
	const [formData, setFormData] = useState({
		title: "",
		sportCategory: "Football",
		description: "",
		dueDate: "",
	})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState("")
	const [success, setSuccess] = useState(false)

	useEffect(() => {
		loadTask()
	}, [id])

	const loadTask = async () => {
		try {
			setLoading(true)
			const response = await apiGet("/api/tasks")
			let task = response.data?.find((t) => t._id === id)

			// If not found in API response, try IndexedDB
			if (!task) {
				try {
					task = await dbTasks.get(id)
				} catch (dbError) {
					// Silent fail
				}
			}

			if (!task) {
				setError("Task not found")
				return
			}

			setFormData({
				title: task.title || "",
				sportCategory: task.sportCategory || "Football",
				description: task.description || "",
				dueDate: task.dueDate
					? new Date(task.dueDate).toISOString().split("T")[0]
					: "",
			})
		} catch (err) {
			// Try IndexedDB as fallback
			try {
				const task = await dbTasks.get(id)
				if (task) {
					setFormData({
						title: task.title || "",
						sportCategory: task.sportCategory || "Football",
						description: task.description || "",
						dueDate: task.dueDate
							? new Date(task.dueDate).toISOString().split("T")[0]
							: "",
					})
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

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}))
		setError("")
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError("")

		if (!formData.title.trim()) {
			setError("Task title is required")
			return
		}

		setSaving(true)
		try {
			const taskData = {
				title: formData.title.trim(),
				sportCategory: formData.sportCategory,
				...(formData.description && {
					description: formData.description.trim(),
				}),
				...(formData.dueDate && {
					dueDate: new Date(formData.dueDate),
				}),
			}

			const response = await apiPut(`/api/tasks/${id}`, taskData)
			// Check if task was updated offline
			if (response.data?._offline || !navigator.onLine) {
				setSuccess(true)
				setError(
					"✓ Task updated offline. It will sync when you're back online."
				)
				// Immediately notify Tasks page to update (INSTANT)
				window.dispatchEvent(
					new CustomEvent("task-updated-offline", {
						detail: response.data,
					})
				)
				// Navigate immediately - no delay
				navigate("/tasks")
			} else {
				navigate("/tasks")
			}
		} catch (err) {
			if (
				err.message?.includes("queued") ||
				err.message?.includes("Offline") ||
				!navigator.onLine
			) {
				setSuccess(true)
				setError(
					"✓ Task updated offline. It will sync when you're back online."
				)
				setTimeout(() => navigate("/tasks"), 2000)
			} else {
				setSuccess(false)
				setError(
					err.response?.data?.message ||
						"Failed to update task. Please try again."
				)
			}
		} finally {
			setSaving(false)
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
			navigate("/tasks")
		} catch (err) {
			setError(
				err.response?.data?.message ||
					"Failed to delete task. Please try again."
			)
		}
	}

	if (loading) {
		return (
			<div className="max-w-3xl mx-auto flex items-center justify-center min-h-96">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			</div>
		)
	}

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => navigate("/tasks")}
					className="p-2 hover:bg-white/10 rounded-lg transition">
					<ArrowLeft className="w-6 h-6 text-gray-400" />
				</button>
				<div className="flex-1">
					<h1 className="flex items-center gap-3 text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
						<Edit className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400" />
						Edit Task
					</h1>
					<p className="text-gray-400 mt-2 text-lg">
						Update your training task details
					</p>
				</div>
			</div>

			{/* Form */}
			<div className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
				<form
					onSubmit={handleSubmit}
					className="space-y-6">
					{error && (
						<div
							className={`p-4 rounded-xl ${
								success
									? "bg-green-500/20 border border-green-500/50 text-green-300"
									: "bg-red-500/20 border border-red-500/50 text-red-300"
							}`}>
							{error}
						</div>
					)}

					{/* Title */}
					<div>
						<label className="block text-sm font-semibold text-gray-300 mb-2">
							Task Title <span className="text-red-400">*</span>
						</label>
						<input
							type="text"
							name="title"
							value={formData.title}
							onChange={handleChange}
							placeholder="e.g., Basketball dribbling drills, Football passing practice..."
							className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition text-lg"
							required
						/>
					</div>

					{/* Category */}
					<div>
						<label className="block text-sm font-semibold text-gray-300 mb-2">
							Sport Category{" "}
							<span className="text-red-400">*</span>
						</label>
						<select
							name="sportCategory"
							value={formData.sportCategory}
							onChange={handleChange}
							className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition text-lg cursor-pointer">
							<option
								value="Football"
								className="bg-slate-800">
								Football
							</option>
							<option
								value="Basketball"
								className="bg-slate-800">
								Basketball
							</option>
							<option
								value="Tennis"
								className="bg-slate-800">
								Tennis
							</option>
							<option
								value="Running"
								className="bg-slate-800">
								Running
							</option>
						</select>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-semibold text-gray-300 mb-2">
							Description{" "}
							<span className="text-gray-500">(Optional)</span>
						</label>
						<textarea
							name="description"
							value={formData.description}
							onChange={handleChange}
							placeholder="Add any additional details, notes, or instructions for this task..."
							rows="4"
							className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition resize-none"
						/>
					</div>

					{/* Due Date */}
					<div>
						<label className="block text-sm font-semibold text-gray-300 mb-2">
							Due Date{" "}
							<span className="text-gray-500">(Optional)</span>
						</label>
						<div className="relative">
							<Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="date"
								name="dueDate"
								value={formData.dueDate}
								onChange={handleChange}
								min={new Date().toISOString().split("T")[0]}
								className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition"
							/>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-4 pt-4 border-t border-white/10">
						<button
							type="button"
							onClick={handleDelete}
							className="flex items-center justify-center gap-2 px-6 py-4 bg-red-600/50 hover:bg-red-600 text-white rounded-xl transition font-semibold">
							<Trash2 className="w-5 h-5" />
							Delete
						</button>
						<div className="flex gap-4 flex-1">
							<button
								type="button"
								onClick={() => navigate("/tasks")}
								className="flex-1 px-6 py-4 bg-gray-600/50 hover:bg-gray-600 text-white rounded-xl transition font-semibold">
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-lg">
								{saving ? (
									<>
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
										Saving...
									</>
								) : (
									<>
										<Save className="w-5 h-5" />
										Save Changes
									</>
								)}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	)
}
