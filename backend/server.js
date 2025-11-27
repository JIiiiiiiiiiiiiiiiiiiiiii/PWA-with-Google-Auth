require("dotenv").config()
const express = require("express")
const http = require("http")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const mongoose = require("mongoose")
const { Server } = require("socket.io")

const authRoutes = require("./routes/auth")
const taskRoutes = require("./routes/tasks")

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
	cors: { origin: process.env.CLIENT_ORIGIN, credentials: true },
})

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("Mongo connected"))
	.catch((err) => console.error(err))

app.use("/api/auth", authRoutes)
app.use("/api/tasks", taskRoutes)

// socket.io
io.on("connection", (socket) => {
	console.log("socket connected", socket.id)
	socket.on("joinRoom", (room) => socket.join(room))
	socket.on("disconnect", () => console.log("socket disconnect", socket.id))
})
app.set("io", io)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Backend running on ${PORT}`))
