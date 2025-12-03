import { useEffect, useState } from "react"
import { Trophy, Zap, Smartphone, BarChart3, Lock, ArrowRight, Rocket, LogIn, Activity, Target, Circle, Dumbbell } from "lucide-react"
import { apiGet } from "../utils/api"

export default function Home() {
	const [user, setUser] = useState(null)
	const [isOnline, setIsOnline] = useState(navigator.onLine)

	useEffect(() => {
		apiGet("/api/auth/me")
			.then((r) => setUser(r.data.user))
			.catch(() => setUser(null))

		const handleOnline = () => setIsOnline(true)
		const handleOffline = () => setIsOnline(false)

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])

	return (
		<div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center text-center px-4 py-12">
			{/* Hero Section */}
			<div className="max-w-4xl mx-auto">
				<div className="mb-8">			
					<h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-yellow-300 via-blue-300 to-purple-300 bg-clip-text text-transparent drop-shadow-2xl leading-tight">
						Welcome to Task Master
					</h1>
					<p className="mt-4 text-gray-300 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
						Elevate your game with the ultimate sports task manager. Track drills, 
						monitor workouts, and achieve your athletic goals with real-time syncing 
						and offline support.
					</p>
				</div>

				{/* Online Status Indicator */}
				{!isOnline && (
					<div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/30 rounded-full">
						<div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
						<span className="text-amber-300 text-sm font-medium">Offline Mode Active</span>
					</div>
				)}

				{/* CTA Buttons */}
				<div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
					{user ? (
						<a
							href="/dashboard"
							className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-green-500/50 hover:scale-105 transition-all font-bold text-lg">
							<ArrowRight className="w-5 h-5" />
							Go to Dashboard
						</a>
					) : (
						<>
							<a
								href="/auth/register"
								className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all font-bold text-lg">
								<Rocket className="w-5 h-5" />
								Get Started Free
							</a>
							<a
								href="/auth/login"
								className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border-2 border-white/20 text-white rounded-xl hover:bg-white/20 hover:scale-105 transition-all font-bold text-lg">
								<LogIn className="w-5 h-5" />
								Sign In
							</a>
						</>
					)}
				</div>
			</div>

			{/* Features Grid */}
			<div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
				<div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-lg border border-green-400/20 rounded-2xl p-6 hover:bg-green-500/20 hover:scale-105 transition-all group">
					<div className="mb-4 group-hover:scale-110 transition-transform">
						<Zap className="w-10 h-10 text-green-400" />
					</div>
					<h3 className="font-bold text-white mb-2 text-lg">Real-time Sync</h3>
					<p className="text-gray-400 text-sm leading-relaxed">
						Instant updates across all your devices. Never miss a beat with live synchronization.
					</p>
				</div>
				
				<div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-lg border border-blue-400/20 rounded-2xl p-6 hover:bg-blue-500/20 hover:scale-105 transition-all group">
					<div className="mb-4 group-hover:scale-110 transition-transform">
						<Smartphone className="w-10 h-10 text-blue-400" />
					</div>
					<h3 className="font-bold text-white mb-2 text-lg">PWA Ready</h3>
					<p className="text-gray-400 text-sm leading-relaxed">
						Install like a native app. Works offline and feels like a premium mobile experience.
					</p>
				</div>
				
				<div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-lg border border-purple-400/20 rounded-2xl p-6 hover:bg-purple-500/20 hover:scale-105 transition-all group">
					<div className="mb-4 group-hover:scale-110 transition-transform">
						<BarChart3 className="w-10 h-10 text-purple-400" />
					</div>
					<h3 className="font-bold text-white mb-2 text-lg">Track Progress</h3>
					<p className="text-gray-400 text-sm leading-relaxed">
						Monitor your training sessions, drills, and workouts. Stay organized and motivated.
					</p>
				</div>

				<div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-lg border border-orange-400/20 rounded-2xl p-6 hover:bg-orange-500/20 hover:scale-105 transition-all group">
					<div className="mb-4 group-hover:scale-110 transition-transform">
						<Lock className="w-10 h-10 text-orange-400" />
					</div>
					<h3 className="font-bold text-white mb-2 text-lg">Secure & Private</h3>
					<p className="text-gray-400 text-sm leading-relaxed">
						Your data is encrypted and secure. Login with Google OAuth or local authentication.
					</p>
				</div>
			</div>

			{/* Sports Categories Preview */}
			<div className="mt-20 max-w-5xl w-full">
				<h2 className="text-3xl font-bold text-white mb-8">Supported Sports</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[
						{ icon: Circle, name: 'Football', color: 'text-green-400', strokeWidth: 2 },
						{ icon: Target, name: 'Basketball', color: 'text-orange-400', strokeWidth: 2 },
						{ icon: Activity, name: 'Tennis', color: 'text-yellow-400', strokeWidth: 2 },
						{ icon: Dumbbell, name: 'Running', color: 'text-cyan-400', strokeWidth: 2 }
					].map((sport) => {
						const Icon = sport.icon
						return (
							<div key={sport.name} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:bg-white/10 transition text-center">
								<div className="flex justify-center mb-2">
									<Icon className={`w-10 h-10 ${sport.color}`} strokeWidth={sport.strokeWidth} />
								</div>
								<div className="text-white font-semibold text-sm">{sport.name}</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
