// backend/routes/tasks.js
const express = require("express")
const Task = require("../models/Task")
const auth = require("../middleware/auth") 
const router = express.Router()

// GET ALL TASKS (require login)
router.get("/", auth, async (req, res) => {
	try {
		const tasks = await Task.find({ owner: req.userId }).sort({
			createdAt: -1,
		})
		res.json(tasks)
	} catch (err) {
		console.error("GET /tasks error:", err)
		res.status(500).json({ message: err.message })
	}
})

// CREATE TASK
router.post("/", auth, async (req, res) => {
	try {
		const t = new Task({ ...req.body, owner: req.userId })
		const saved = await t.save()
		req.app.get("io").to(req.userId.toString()).emit("task-created", saved)
		res.json(saved)
	} catch (err) {
		console.error("POST /tasks error:", err)
		res.status(500).json({ message: err.message })
	}
})

// UPDATE TASK
router.put("/:id", auth, async (req, res) => {
	try {
		const updated = await Task.findOneAndUpdate(
			{ _id: req.params.id, owner: req.userId },
			{ ...req.body, updatedAt: Date.now() },
			{ new: true }
		)
		if (!updated) return res.status(404).json({ message: "Not found" })
		req.app
			.get("io")
			.to(req.userId.toString())
			.emit("task-updated", updated)
		res.json(updated)
	} catch (err) {
		console.error("PUT /tasks/:id error:", err)
		res.status(500).json({ message: err.message })
	}
})

// DELETE TASK
router.delete("/:id", auth, async (req, res) => {
	try {
		const deleted = await Task.findOneAndDelete({
			_id: req.params.id,
			owner: req.userId,
		})
		if (!deleted) return res.status(404).json({ message: "Not found" })
		req.app
			.get("io")
			.to(req.userId.toString())
			.emit("task-deleted", deleted._id)
		res.json({ ok: true })
	} catch (err) {
		console.error("DELETE /tasks/:id error:", err)
		res.status(500).json({ message: err.message })
	}
})

module.exports = router
