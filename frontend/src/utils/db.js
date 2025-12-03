// IndexedDB utility for offline data storage
const DB_NAME = 'SportsYarniaDB'
const DB_VERSION = 1

const STORES = {
	TASKS: 'tasks',
	USERS: 'users',
	SYNC_QUEUE: 'syncQueue',
	AUTH: 'auth'
}

let db = null

export const initDB = () => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)

		request.onerror = () => reject(request.error)
		request.onsuccess = () => {
			db = request.result
			resolve(db)
		}

		request.onupgradeneeded = (event) => {
			const database = event.target.result

			// Tasks store
			if (!database.objectStoreNames.contains(STORES.TASKS)) {
				const taskStore = database.createObjectStore(STORES.TASKS, { keyPath: '_id' })
				taskStore.createIndex('owner', 'owner', { unique: false })
				taskStore.createIndex('completed', 'completed', { unique: false })
			}

			// Users store
			if (!database.objectStoreNames.contains(STORES.USERS)) {
				database.createObjectStore(STORES.USERS, { keyPath: '_id' })
			}

			// Sync queue store
			if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
				const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { 
					keyPath: 'id', 
					autoIncrement: true 
				})
				syncStore.createIndex('type', 'type', { unique: false })
				syncStore.createIndex('status', 'status', { unique: false })
			}

			// Auth store
			if (!database.objectStoreNames.contains(STORES.AUTH)) {
				database.createObjectStore(STORES.AUTH, { keyPath: 'key' })
			}
		}
	})
}

const getStore = (storeName, mode = 'readwrite') => {
	if (!db) throw new Error('Database not initialized')
	return db.transaction([storeName], mode).objectStore(storeName)
}

// Tasks operations
export const dbTasks = {
	async getAll() {
		const store = getStore(STORES.TASKS, 'readonly')
		return new Promise((resolve, reject) => {
			const request = store.getAll()
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async get(id) {
		const store = getStore(STORES.TASKS, 'readonly')
		return new Promise((resolve, reject) => {
			const request = store.get(id)
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async add(task) {
		const store = getStore(STORES.TASKS)
		return new Promise((resolve, reject) => {
			// Only add _offline flag if it's not already set or if task doesn't have it
			const taskToStore = task._offline !== undefined ? task : { ...task, _offline: true }
			const request = store.put(taskToStore)
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async update(task) {
		const store = getStore(STORES.TASKS)
		return new Promise((resolve, reject) => {
			const request = store.put({ ...task, _offline: true })
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async delete(id) {
		const store = getStore(STORES.TASKS)
		return new Promise((resolve, reject) => {
			const request = store.delete(id)
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
	},

	async clear() {
		const store = getStore(STORES.TASKS)
		return new Promise((resolve, reject) => {
			const request = store.clear()
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
	}
}

// Sync queue operations
export const syncQueue = {
	async add(operation) {
		const store = getStore(STORES.SYNC_QUEUE)
		return new Promise((resolve, reject) => {
			const request = store.add({
				...operation,
				status: 'pending',
				timestamp: Date.now()
			})
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async getAll() {
		const store = getStore(STORES.SYNC_QUEUE, 'readonly')
		return new Promise((resolve, reject) => {
			const request = store.getAll()
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async getPending() {
		const store = getStore(STORES.SYNC_QUEUE, 'readonly')
		const index = store.index('status')
		return new Promise((resolve, reject) => {
			const request = index.getAll('pending')
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		})
	},

	async update(id, updates) {
		const store = getStore(STORES.SYNC_QUEUE)
		return new Promise((resolve, reject) => {
			const getRequest = store.get(id)
			getRequest.onsuccess = () => {
				const item = getRequest.result
				const updateRequest = store.put({ ...item, ...updates })
				updateRequest.onsuccess = () => resolve()
				updateRequest.onerror = () => reject(updateRequest.error)
			}
			getRequest.onerror = () => reject(getRequest.error)
		})
	},

	async delete(id) {
		const store = getStore(STORES.SYNC_QUEUE)
		return new Promise((resolve, reject) => {
			const request = store.delete(id)
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
	}
}

// Auth operations
export const dbAuth = {
	async setUser(user) {
		const store = getStore(STORES.AUTH)
		return new Promise((resolve, reject) => {
			const request = store.put({ key: 'user', value: user })
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
	},

	async getUser() {
		const store = getStore(STORES.AUTH, 'readonly')
		return new Promise((resolve, reject) => {
			const request = store.get('user')
			request.onsuccess = () => resolve(request.result?.value || null)
			request.onerror = () => reject(request.error)
		})
	},

	async clear() {
		const store = getStore(STORES.AUTH)
		return new Promise((resolve, reject) => {
			const request = store.clear()
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
	}
}

// Initialize on import
if (typeof window !== 'undefined' && 'indexedDB' in window) {
	initDB().catch(() => {})
}

