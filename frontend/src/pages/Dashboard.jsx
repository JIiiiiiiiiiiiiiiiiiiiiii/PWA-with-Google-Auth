import { useEffect, useState } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api"
import { io } from "socket.io-client"

let socket

export default function Dashboard({ user }) {
	const [tasks, setTasks] = useState([])
	const [title, setTitle] = useState("")
	const [category, setCategory] = useState("Football")

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

	const badgeColor = {
		Football: "bg-green-600",
		Basketball: "bg-orange-500",
		Tennis: "bg-yellow-400 text-black",
		Running: "bg-blue-600",
	}

	return (
		<div className="max-w-3xl mx-auto">
			{/* HEADER */}
			<h1 className="text-3xl font-bold text-blue-700 mb-6">
				Your Training Tasks
			</h1>

			{/* CREATE NEW TASK */}
			<div className="bg-white shadow-lg rounded-xl p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4">Add New Task</h2>
				<form
					onSubmit={addTask}
					className="space-y-4">
					<input
						type="text"
						placeholder="e.g., Basketball dribbling drills"
						className="w-full p-3 border rounded-lg bg-gray-100"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>

					<select
						className="w-full p-3 border rounded-lg bg-gray-100"
						value={category}
						onChange={(e) => setCategory(e.target.value)}>
						<option>Football</option>
						<option>Basketball</option>
						<option>Tennis</option>
						<option>Running</option>
					</select>

					<button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
						Add Task
					</button>
				</form>
			</div>

			{/* TASK LIST */}
			{tasks.length === 0 && (
				<p className="text-gray-500 text-center">No tasks yet.</p>
			)}

			<div className="space-y-4">
				{tasks.map((task) => (
					<div
						key={task._id}
						className="bg-white shadow-md p-5 rounded-xl flex justify-between items-center hover:shadow-xl transition">
						{/* LEFT SIDE */}
						<div>
							<h3
								className={`text-lg font-semibold ${
									task.completed
										? "line-through text-gray-400"
										: ""
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

						{/* ACTIONS */}
						<div className="flex gap-3">
							<button
								onClick={() => toggleComplete(task)}
								className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
								{task.completed ? "Undo" : "Done"}
							</button>

							<button
								onClick={() => removeTask(task)}
								className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
								Delete
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
