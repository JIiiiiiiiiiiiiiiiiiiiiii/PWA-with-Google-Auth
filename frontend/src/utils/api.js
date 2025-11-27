import axios from "axios"

// Use a relative URL in development so Vite's proxy forwards to the backend.
// In production use the configured API URL.
const baseURL = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL

export const api = axios.create({
	baseURL,
	withCredentials: true,
})

export const apiGet = (url) => api.get(url)
export const apiPost = (url, body) => api.post(url, body)
export const apiPut = (url, body) => api.put(url, body)
export const apiDelete = (url) => api.delete(url)

export default api
