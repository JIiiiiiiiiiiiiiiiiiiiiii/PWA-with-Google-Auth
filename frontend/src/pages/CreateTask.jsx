import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, ArrowLeft, Sparkles, Calendar } from "lucide-react"
import { apiPost } from "../utils/api"

export default function CreateTask() {
	const navigate = useNavigate()
	const [formData, setFormData] = useState({
		title: "",
		sportCategory: "Football",
		description: "",
		dueDate: "",
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const [success, setSuccess] = useState(false)

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

		setLoading(true)
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

			const response = await apiPost("/api/tasks", taskData)
			// Check if task was created offline
			if (response.data?._offline || !navigator.onLine) {
				setSuccess(true)
				setError(
					"✓ Task created offline. It will sync when you're back online."
				)
				// Immediately notify Tasks page to update (INSTANT)
				window.dispatchEvent(
					new CustomEvent("task-created-offline", {
						detail: response.data,
					})
				)
				// Navigate immediately - no delay
				navigate("/tasks", { replace: true })
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
					"✓ Task created offline. It will sync when you're back online."
				)
				setTimeout(() => navigate("/tasks"), 2000)
			} else {
				setSuccess(false)
				setError(
					err.response?.data?.message ||
						"Failed to create task. Please try again."
				)
			}
		} finally {
			setLoading(false)
		}
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
				<div>
					<h1 className="flex items-center gap-3 text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
						<Plus className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400" />
						Create New Task
					</h1>
					<p className="text-gray-400 mt-2 text-lg">
						Add a new training task to your sports routine
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
						<p className="mt-2 text-xs text-gray-400">
							Be specific about what you want to accomplish
						</p>
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
						<p className="mt-2 text-xs text-gray-400">
							Set a deadline to stay on track
						</p>
					</div>

					{/* Submit Buttons */}
					<div className="flex gap-4 pt-4">
						<button
							type="button"
							onClick={() => navigate("/tasks")}
							className="flex-1 px-6 py-4 bg-gray-600/50 hover:bg-gray-600 text-white rounded-xl transition font-semibold">
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-lg">
							{loading ? (
								<>
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
									Creating...
								</>
							) : (
								<>
									<Sparkles className="w-5 h-5" />
									Create Task
								</>
							)}
						</button>
					</div>
				</form>
			</div>

			{/* Tips */}
			<div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-lg border border-blue-400/20 rounded-2xl p-6">
				<h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
					<Sparkles className="w-5 h-5 text-blue-400" />
					Tips for Better Tasks
				</h3>
				<ul className="space-y-2 text-gray-300 text-sm">
					<li className="flex items-start gap-2">
						<span className="text-blue-400 mt-1">•</span>
						<span>
							Be specific about what you want to accomplish
						</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-blue-400 mt-1">•</span>
						<span>
							Set realistic deadlines to maintain motivation
						</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-blue-400 mt-1">•</span>
						<span>
							Break down large goals into smaller, manageable
							tasks
						</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-blue-400 mt-1">•</span>
						<span>
							Use descriptions to add context and track progress
						</span>
					</li>
				</ul>
			</div>
		</div>
	)
}
