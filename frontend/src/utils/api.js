import axios from "axios"
import { dbTasks, dbAuth } from "./db"
import { syncManager } from "./sync"

// Use a relative URL in development so Vite's proxy forwards to the backend.
// In production use the configured API URL.
const baseURL = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL

export const api = axios.create({
	baseURL,
	withCredentials: true,
	timeout: 10000, // 10 second timeout for sync operations
})

// Add response interceptor to handle errors gracefully
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (
			error.code === "ECONNREFUSED" ||
			error.code === "ERR_NETWORK" ||
			error.message?.includes("timeout") ||
			error.response?.status === 503
		) {
			error.suppressLog = true
		}
		return Promise.reject(error)
	}
)

let backendReachable = true
let lastBackendCheck = 0
const BACKEND_CHECK_COOLDOWN = 5000

const checkBackendReachability = async () => {
	const now = Date.now()
	if (now - lastBackendCheck < BACKEND_CHECK_COOLDOWN) {
		return backendReachable
	}
	lastBackendCheck = now

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 2000)
		await fetch(`${baseURL || ""}/api/auth/me`, {
			method: "HEAD",
			signal: controller.signal,
			credentials: "include",
		})
		clearTimeout(timeoutId)
		backendReachable = true
		return true
	} catch (error) {
		backendReachable = false
		return false
	}
}

const isOnline = async () => {
	if (!navigator.onLine) {
		backendReachable = false
		return false
	}
	return await checkBackendReachability()
}

const isOnlineSync = () => {
	if (!navigator.onLine) {
		return false
	}
	return backendReachable
}

// Create a timeout promise
const timeoutPromise = (ms) =>
	new Promise((_, reject) =>
		setTimeout(() => reject(new Error("Request timeout")), ms)
	)

const backgroundRefreshPromises = new Map()
const LAST_REFRESH_TIME = new Map()
const REFRESH_COOLDOWN = 2000

const lastApiCallTime = new Map()
const API_CALL_COOLDOWN = 2000
export const apiGet = async (url) => {
	if (url === "/api/auth/me") {
		const now = Date.now()
		const lastCall = lastApiCallTime.get(url) || 0
		if (now - lastCall < API_CALL_COOLDOWN && isOnlineSync()) {
			const user = await dbAuth.getUser()
			if (user) {
				return { data: { user } }
			}
			throw new Error("API call cooldown - using cache")
		}
		lastApiCallTime.set(url, now)
	}

	let cachedData = null
	if (url === "/api/tasks") {
		const tasks = await dbTasks.getAll()
		if (tasks && tasks.length > 0) {
			cachedData = { data: tasks }
		}
	} else if (url === "/api/auth/me") {
		const user = await dbAuth.getUser()
		if (user) {
			cachedData = { data: { user } }
		}
	}

	const online = await isOnline()
	if (!online) {
		if (cachedData) {
			return cachedData
		}
		throw new Error("Offline: No cached data available")
	}

	const lastRefresh = LAST_REFRESH_TIME.get(url) || 0
	const now = Date.now()
	const canRefresh =
		!backgroundRefreshPromises.has(url) &&
		now - lastRefresh > REFRESH_COOLDOWN &&
		backendReachable

	if (canRefresh) {
		LAST_REFRESH_TIME.set(url, now)
		const refreshPromise = (async () => {
			try {
				const response = await Promise.race([
					api.get(url),
					timeoutPromise(5000),
				])

				if (url === "/api/tasks" && response.data) {
					const existingTasks = await dbTasks.getAll()
					const offlineTasks = existingTasks.filter(
						(t) => t._offline && t._pending
					)

					await dbTasks.clear()
					for (const task of response.data) {
						await dbTasks.add(task)
					}
					for (const task of offlineTasks) {
						await dbTasks.add(task)
					}
					window.dispatchEvent(
						new CustomEvent("tasks-refreshed", {
							detail: response.data,
						})
					)
				} else if (url === "/api/auth/me" && response.data?.user) {
					await dbAuth.setUser(response.data.user)
				}

				return response
			} catch (error) {
				backendReachable = false
				lastBackendCheck = 0
				return null
			} finally {
				backgroundRefreshPromises.delete(url)
			}
		})()

		backgroundRefreshPromises.set(url, refreshPromise)

		refreshPromise.catch(() => {})
	}

	if (cachedData) {
		return cachedData
	}

	try {
		const response = await Promise.race([
			api.get(url),
			timeoutPromise(5000),
		])

		if (url === "/api/tasks" && response.data) {
			const existingTasks = await dbTasks.getAll()
			const offlineTasks = existingTasks.filter(
				(t) => t._offline && t._pending
			)

			await dbTasks.clear()
			for (const task of response.data) {
				await dbTasks.add(task)
			}
			for (const task of offlineTasks) {
				await dbTasks.add(task)
			}
		} else if (url === "/api/auth/me" && response.data?.user) {
			await dbAuth.setUser(response.data.user)
		}

		return response
	} catch (error) {
		throw error
	}
}

export const apiPost = async (url, body) => {
	const online = await isOnline()
	if (!online) {
		if (url === "/api/tasks") {
			const user = await dbAuth.getUser()
			const tempId = `temp_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`
			const localTask = {
				_id: tempId,
				...body,
				owner: user?._id || "offline-user",
				completed: false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				_offline: true,
				_pending: true,
			}
			await dbTasks.add(localTask)
			syncManager
				.queueOperation({
					type: "CREATE_TASK",
					method: "POST",
					url,
					data: {
						...body,
						owner: user?._id,
					},
					taskId: tempId,
				})
				.catch(() => {})
			window.dispatchEvent(
				new CustomEvent("task-created-offline", {
					detail: localTask,
				})
			)
			return { data: localTask }
		}
		if (url === "/api/auth/register" || url === "/api/auth/login") {
			const error = new Error(
				"Authentication requires internet connection. Please connect to the internet to login or register."
			)
			error.offline = true
			throw error
		}
		throw new Error("Operation queued for sync when online")
	}

	try {
		const response = await Promise.race([
			api.post(url, body),
			timeoutPromise(3000),
		])

		if (url === "/api/tasks" && response.data) {
			await dbTasks.add(response.data)
		}
		return response
	} catch (error) {
		if (
			error.code === "ECONNREFUSED" ||
			error.code === "ERR_NETWORK" ||
			error.message?.includes("timeout") ||
			error.response?.status === 503
		) {
			backendReachable = false
			lastBackendCheck = 0
		}

		if (
			url === "/api/tasks" &&
			(error.message.includes("timeout") ||
				error.code === "ECONNREFUSED" ||
				error.code === "ERR_NETWORK")
		) {
			const user = await dbAuth.getUser()
			const tempId = `temp_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`
			const localTask = {
				_id: tempId,
				...body,
				owner: user?._id || "offline-user",
				completed: false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				_offline: true,
				_pending: true,
			}
			await dbTasks.add(localTask)
			syncManager
				.queueOperation({
					type: "CREATE_TASK",
					method: "POST",
					url,
					data: {
						...body,
						owner: user?._id,
					},
					taskId: tempId,
				})
				.catch(() => {})
			window.dispatchEvent(
				new CustomEvent("task-created-offline", {
					detail: localTask,
				})
			)
			return { data: localTask }
		}
		throw error
	}
}

export const apiPut = async (url, body) => {
	const online = await isOnline()
	if (!online) {
		if (url.startsWith("/api/tasks/")) {
			const taskId = url.split("/").pop()
			const existing = await dbTasks.get(taskId)
			if (existing) {
				const updated = {
					...existing,
					...body,
					_id: taskId,
					_offline: true,
					_pending: true,
					updatedAt: new Date().toISOString(),
				}
				await dbTasks.update(updated)
				syncManager
					.queueOperation({
						type: "UPDATE_TASK",
						method: "PUT",
						url,
						data: body,
						taskId,
					})
					.catch(() => {})
				window.dispatchEvent(
					new CustomEvent("task-updated-offline", {
						detail: updated,
					})
				)
				return { data: updated }
			}
		}
		throw new Error("Task not found in local cache")
	}

	try {
		const response = await Promise.race([
			api.put(url, body),
			timeoutPromise(3000),
		])

		if (url.startsWith("/api/tasks/") && response.data) {
			await dbTasks.update(response.data)
		}
		return response
	} catch (error) {
		if (
			error.code === "ECONNREFUSED" ||
			error.code === "ERR_NETWORK" ||
			error.message?.includes("timeout") ||
			error.response?.status === 503
		) {
			backendReachable = false
			lastBackendCheck = 0
		}

		if (
			url.startsWith("/api/tasks/") &&
			(error.message.includes("timeout") ||
				error.code === "ECONNREFUSED" ||
				error.code === "ERR_NETWORK")
		) {
			const taskId = url.split("/").pop()
			const existing = await dbTasks.get(taskId)
			if (existing) {
				const updated = {
					...existing,
					...body,
					_offline: true,
					_pending: true,
					updatedAt: new Date().toISOString(),
				}
				await dbTasks.update(updated)
				await syncManager.queueOperation({
					type: "UPDATE_TASK",
					method: "PUT",
					url,
					data: body,
					taskId,
				})
				window.dispatchEvent(
					new CustomEvent("task-updated-offline", {
						detail: updated,
					})
				)
				return { data: updated }
			}
		}
		throw error
	}
}

export const apiDelete = async (url) => {
	const online = await isOnline()
	if (!online) {
		if (url.startsWith("/api/tasks/")) {
			const taskId = url.split("/").pop()
			const existing = await dbTasks.get(taskId)
			if (existing) {
				await dbTasks.delete(taskId)
				if (!taskId.startsWith("temp_")) {
					syncManager
						.queueOperation({
							type: "DELETE_TASK",
							method: "DELETE",
							url,
							taskId,
						})
						.catch(() => {})
				}
				window.dispatchEvent(
					new CustomEvent("task-deleted-offline", {
						detail: { _id: taskId },
					})
				)
				return { data: { ok: true } }
			}
		}
		throw new Error("Task not found in local cache")
	}

	try {
		const response = await Promise.race([
			api.delete(url),
			timeoutPromise(3000),
		])

		if (url.startsWith("/api/tasks/")) {
			const taskId = url.split("/").pop()
			await dbTasks.delete(taskId)
		}
		return response
	} catch (error) {
		if (
			error.code === "ECONNREFUSED" ||
			error.code === "ERR_NETWORK" ||
			error.message?.includes("timeout") ||
			error.response?.status === 503
		) {
			backendReachable = false
			lastBackendCheck = 0
		}

		if (
			url.startsWith("/api/tasks/") &&
			(error.message.includes("timeout") ||
				error.code === "ECONNREFUSED" ||
				error.code === "ERR_NETWORK")
		) {
			const taskId = url.split("/").pop()
			const existing = await dbTasks.get(taskId)
			if (existing) {
				await dbTasks.delete(taskId)
				if (!taskId.startsWith("temp_")) {
					await syncManager.queueOperation({
						type: "DELETE_TASK",
						method: "DELETE",
						url,
						taskId,
					})
				}
				window.dispatchEvent(
					new CustomEvent("task-deleted-offline", {
						detail: { _id: taskId },
					})
				)
				return { data: { ok: true } }
			}
		}
		throw error
	}
}

export default api
