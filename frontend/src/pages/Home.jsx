import { useEffect, useState } from "react"
import { apiGet } from "../utils/api"

export default function Home() {
	const [user, setUser] = useState(null)

	useEffect(() => {
		apiGet("/api/auth/me")
			.then((r) => setUser(r.data.user))
			.catch(() => setUser(null))
	}, [])

	return (
		<div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center text-center px-4 py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
			<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-yellow-300 via-blue-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">
				Welcome to Sports Yarnia
			</h1>

			<p className="mt-4 text-gray-300 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed">
				Track your sports tasks, drills, practices, and workouts with
				real-time syncing and installable PWA features. Stay fit, stay
				organized.
			</p>

			<div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
				{user ? (
					<a
						href="/dashboard"
						className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg hover:shadow-green-500/50 hover:scale-105 transition-all font-semibold">
						Go to Dashboard
					</a>
				) : (
					<a
						href="/auth/register"
						className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all font-semibold">
						Create Account
					</a>
				)}
			</div>

			<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
				<div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition">
					<h3 className="font-bold text-white mb-2">
						Real-time Sync
					</h3>
					<p className="text-gray-400 text-sm">
						Instant updates across devices
					</p>
				</div>
				<div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition">
					<h3 className="font-bold text-white mb-2">PWA Support</h3>
					<p className="text-gray-400 text-sm">
						Install like a native app
					</p>
				</div>
				<div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition">
					<h3 className="font-bold text-white mb-2">
						Track Progress
					</h3>
					<p className="text-gray-400 text-sm">
						Manage all your sports goals
					</p>
				</div>
			</div>
		</div>
	)
}
