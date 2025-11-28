import { useEffect, useState } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api"
import { io } from "socket.io-client"

let socket

export default function Dashboard({ user }) {
	const [tasks, setTasks] = useState([])
	const [title, setTitle] = useState("")
	const [category, setCategory] = useState("Football")

	const [editTask, setEditTask] = useState(null)
	const [editTitle, setEditTitle] = useState("")
	const [editCategory, setEditCategory] = useState("Football")

	useEffect(() => {
		apiGet("/api/tasks")
			.then((r) => setTasks(r.data))
			.catch(() => setTasks([]))

		socket = io(import.meta.env.VITE_API_URL, { withCredentials: true })
		socket.emit("joinRoom", user._id)

		socket.on("task-created", (t) => setTasks((prev) => [t, ...prev]))
		socket.on("task-updated", (t) =>
			setTasks((prev) => prev.map((p) => (p._id === t._id ? t : p)))
		)
		socket.on("task-deleted", (id) =>
			setTasks((prev) => prev.filter((p) => p._id !== id))
		)

		return () => socket.disconnect()
	}, [])

	// Add Task
	const addTask = async (e) => {
		e.preventDefault()
		if (!title.trim()) return
		await apiPost("/api/tasks", { title, sportCategory: category })
		setTitle("")
	}

	const toggleComplete = async (task) => {
		await apiPut(`/api/tasks/${task._id}`, {
			...task,
			completed: !task.completed,
		})
	}

	const removeTask = async (task) => {
		await apiDelete(`/api/tasks/${task._id}`)
	}

	const openEdit = (task) => {
		setEditTask(task)
		setEditTitle(task.title)
		setEditCategory(task.sportCategory)
	}

	const saveEdit = async () => {
		await apiPut(`/api/tasks/${editTask._id}`, {
			...editTask,
			title: editTitle,
			sportCategory: editCategory,
		})
		setEditTask(null)
	}

	// Tag Colors
	const badgeColor = {
		Football: "bg-gradient-to-r from-green-500 to-green-700",
		Basketball: "bg-gradient-to-r from-orange-400 to-orange-600",
		Tennis: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900",
		Running: "bg-gradient-to-r from-cyan-500 to-blue-600",
	}

	return (
		<div className="max-w-5xl mx-auto">
			{/* HEADER */}
			<div className="mb-8">
				<h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-lg">
					Your Training Tasks
				</h1>
				<p className="text-gray-400 mt-2">
					Track your sports drills, practices, and workouts
				</p>
			</div>

			{/* ADD TASK CARD */}
			<div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-8 hover:bg-white/10 transition">
				<h2 className="text-xl font-bold text-white mb-4">
					Add New Task
				</h2>

				<form
					onSubmit={addTask}
					className="space-y-4">
					<input
						type="text"
						placeholder="e.g., Basketball dribbling drills"
						className="w-full p-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<select
							className="p-3 rounded-lg bg-white/5 border border-white/20 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
							value={category}
							onChange={(e) => setCategory(e.target.value)}>
							<option className="bg-slate-800">Football</option>
							<option className="bg-slate-800">Basketball</option>
							<option className="bg-slate-800">Tennis</option>
							<option className="bg-slate-800">Running</option>
						</select>

						<button className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] transition-all font-semibold">
							Add Task
						</button>
					</div>
				</form>
			</div>

			{/* TASK LIST */}
			<div className="space-y-4">
				{tasks.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-gray-400 text-lg">
							No tasks yet. Create one to get started!
						</p>
					</div>
				) : (
					tasks.map((task) => (
						<div
							key={task._id}
							className="bg-white/5 backdrop-blur-lg border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:shadow-lg transition-all">
							<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
								<div className="flex-1">
									<h3
										className={`text-lg font-bold ${
											task.completed
												? "line-through text-gray-500"
												: "text-white"
										}`}>
										{task.title}
									</h3>

									<span
										className={`mt-2 inline-block px-3 py-1 text-xs rounded-full text-white font-semibold ${
											badgeColor[task.sportCategory]
										}`}>
										{task.sportCategory}
									</span>
								</div>

								{/* BUTTONS */}
								<div className="flex gap-2 flex-wrap sm:flex-nowrap">
									<button
										onClick={() => toggleComplete(task)}
										className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm">
										{task.completed ? "Undo" : "Done"}
									</button>

									<button
										onClick={() => openEdit(task)}
										className="flex-1 sm:flex-none px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold text-sm">
										Edit
									</button>

									<button
										onClick={() => removeTask(task)}
										className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm">
										Delete
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* EDIT MODAL */}
			{editTask && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
					<div className="bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 animate-fadeIn">
						<h2 className="text-2xl font-bold mb-4 text-white">
							Edit Task
						</h2>

						<input
							className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-500 mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition"
							value={editTitle}
							onChange={(e) => setEditTitle(e.target.value)}
							placeholder="Task title"
						/>

						<select
							className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition"
							value={editCategory}
							onChange={(e) => setEditCategory(e.target.value)}>
							<option className="bg-slate-800">Football</option>
							<option className="bg-slate-800">Basketball</option>
							<option className="bg-slate-800">Tennis</option>
							<option className="bg-slate-800">Running</option>
						</select>

						{/* Modal Buttons */}
						<div className="flex justify-end gap-3">
							<button
								className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
								onClick={() => setEditTask(null)}>
								Cancel
							</button>

							<button
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
								onClick={saveEdit}>
								Save Changes
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
