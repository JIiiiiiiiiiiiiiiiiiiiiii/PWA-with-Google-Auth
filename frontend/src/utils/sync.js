import { syncQueue, dbTasks } from "./db"

export { syncQueue }

class SyncManager {
	constructor() {
		this.syncing = false
		this.listeners = []
		this.init()
	}

	init() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => {
				setTimeout(() => this.sync(), 500)
			})
			if (navigator.onLine) {
				setTimeout(() => {
					this.sync()
				}, 1000)
			}
		}
	}

	onSync(callback) {
		this.listeners.push(callback)
	}

	notifyListeners(event) {
		this.listeners.forEach((cb) => cb(event))
	}

	async sync() {
		if (this.syncing || !navigator.onLine) {
			return
		}

		this.syncing = true
		this.notifyListeners({ type: "sync-start" })

		try {
			const pending = await syncQueue.getPending()

			if (pending.length === 0) {
				this.syncing = false
				this.notifyListeners({ type: "sync-complete", count: 0 })
				return
			}

			// Sort operations: CREATE first, then UPDATE, then DELETE
			// This ensures temp tasks are created before they're updated
			const sortedOperations = pending.sort((a, b) => {
				const order = { CREATE_TASK: 1, UPDATE_TASK: 2, DELETE_TASK: 3 }
				return (order[a.type] || 99) - (order[b.type] || 99)
			})

			// Track temp ID to real ID mappings
			const tempIdMap = new Map()

			let successCount = 0
			let failCount = 0

			for (const operation of sortedOperations) {
				try {
					// Handle UPDATE operations for temp IDs
					if (
						operation.type === "UPDATE_TASK" &&
						operation.taskId &&
						operation.taskId.startsWith("temp_")
					) {
						// Check if this temp task has been created (mapped to real ID)
						if (tempIdMap.has(operation.taskId)) {
							// Update the operation with the real ID
							const realId = tempIdMap.get(operation.taskId)
							operation.taskId = realId
							operation.url = `/api/tasks/${realId}`
						} else {
							// Check if the task exists in IndexedDB with a real ID (CREATE was already processed)
							try {
								const task = await dbTasks.get(operation.taskId)
								if (
									task &&
									task._id &&
									!task._id.startsWith("temp_")
								) {
									// Task has been synced, update the operation with real ID
									operation.taskId = task._id
									operation.url = `/api/tasks/${task._id}`
									tempIdMap.set(operation.taskId, task._id)
								} else {
									// Skip this update - the CREATE hasn't completed yet
									continue
								}
							} catch (dbError) {
								continue
							}
						}
					}

					// Handle DELETE operations for temp IDs
					if (
						operation.type === "DELETE_TASK" &&
						operation.taskId &&
						operation.taskId.startsWith("temp_")
					) {
						// Temp tasks were never on the server, just delete from IndexedDB
						try {
							await dbTasks.delete(operation.taskId)
							await syncQueue.delete(operation.id)
							successCount++
							continue
						} catch (error) {
							await syncQueue.delete(operation.id)
							successCount++
							continue
						}
					}

					const result = await this.executeOperation(
						operation,
						tempIdMap
					)

					if (
						operation.type === "CREATE_TASK" &&
						operation.taskId &&
						result?.realId
					) {
						tempIdMap.set(operation.taskId, result.realId)
					}

					await syncQueue.delete(operation.id)
					successCount++
				} catch (error) {
					if (
						error.message?.includes("ObjectId") ||
						error.message?.includes("Cast to ObjectId") ||
						error.response?.status === 400
					) {
						continue
					}
					const retryCount = (operation.retryCount || 0) + 1
					if (retryCount >= 3) {
						await syncQueue.update(operation.id, {
							status: "failed",
							error: error.message,
							retryCount,
						})
						failCount++
					} else {
						await syncQueue.update(operation.id, {
							retryCount,
						})
					}
				}
			}

			if (successCount > 0) {
				try {
					// Wait a bit for server to process the operations
					await new Promise((resolve) => setTimeout(resolve, 500))

					// Dynamic import to avoid circular dependency
					const { api } = await import("./api")
					const response = await api.get("/api/tasks")
					const tasks = response.data || []

					const existingTasks = await dbTasks.getAll()
					const remainingOfflineTasks = existingTasks.filter(
						(t) => t._offline && t._pending
					)

					await dbTasks.clear()
					for (const task of tasks) {
						const cleanTask = { ...task }
						delete cleanTask._offline
						delete cleanTask._pending
						await dbTasks.add(cleanTask)
					}
					for (const task of remainingOfflineTasks) {
						await dbTasks.add(task)
					}

					window.dispatchEvent(
						new CustomEvent("tasks-refreshed", {
							detail: tasks,
						})
					)

					this.notifyListeners({ type: "tasks-refreshed" })
				} catch (error) {
					// Silent fail
				}
			}

			this.notifyListeners({
				type: "sync-complete",
				success: successCount,
				failed: failCount,
			})
		} catch (error) {
			this.notifyListeners({ type: "sync-error", error })
		} finally {
			this.syncing = false
		}
	}

	async executeOperation(operation, tempIdMap = new Map()) {
		const { type, method, url, data, taskId } = operation

		// Dynamic import to avoid circular dependency
		const { api } = await import("./api")

		switch (type) {
			case "CREATE_TASK":
				try {
					const createResponse = await api.post(url, data)
					const createdTask = createResponse.data

					if (!createdTask || !createdTask._id) {
						throw new Error(
							"Server did not return a valid task with _id"
						)
					}

					if (taskId && createdTask) {
						try {
							await dbTasks.delete(taskId)
							const syncedTask = { ...createdTask }
							delete syncedTask._offline
							delete syncedTask._pending
							await dbTasks.add(syncedTask)
							return { realId: createdTask._id }
						} catch (error) {
							return { realId: createdTask._id }
						}
					}
					return { realId: createdTask?._id }
				} catch (error) {
					throw error
				}
			case "UPDATE_TASK":
				if (taskId && taskId.startsWith("temp_")) {
					throw new Error(
						`Cannot update task with temp ID: ${taskId}`
					)
				}
				try {
					const updateResponse = await api.put(url, data)

					if (!updateResponse.data) {
						throw new Error(
							"Server did not return updated task data"
						)
					}

					await dbTasks.update(updateResponse.data)
					const syncedTask = { ...updateResponse.data }
					delete syncedTask._offline
					delete syncedTask._pending
					await dbTasks.update(syncedTask)
				} catch (error) {
					throw error
				}
				break
			case "DELETE_TASK":
				if (taskId && taskId.startsWith("temp_")) {
					await dbTasks.delete(taskId)
					return
				}
				await api.delete(url)
				break
			case "REGISTER":
				await api.post(url, data)
				break
			case "LOGIN":
				await api.post(url, data)
				break
			default:
				throw new Error(`Unknown operation type: ${type}`)
		}
	}

	async queueOperation(operation) {
		return await syncQueue.add(operation)
	}

	isSyncing() {
		return this.syncing
	}
}

export const syncManager = new SyncManager()
