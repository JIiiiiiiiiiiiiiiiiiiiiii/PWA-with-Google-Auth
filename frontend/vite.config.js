import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:5000",
				changeOrigin: true,
				// Don't fail on connection errors - let the app handle it
				configure: (proxy, _options) => {
					proxy.on('error', (err, _req, _res) => {
						// Suppress proxy errors when backend is down
						// The app will handle offline mode
					})
				},
			},
		},
		// Suppress HMR WebSocket errors when backend is down
		hmr: {
			clientPort: 5173,
		},
	},
})
