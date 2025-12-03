import { useState } from "react"
import { apiPost } from "../utils/api"

export default function Register() {
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [pw, setPw] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	const submit = async (e) => {
		e.preventDefault()
		setError("")
		setLoading(true)
		try {
			await apiPost("/api/auth/register", { name, email, password: pw })
			window.location.href = "/dashboard"
		} catch (err) {
			if (err.offline || !navigator.onLine) {
				setError("Registration requires an internet connection. Please connect to the internet and try again.")
			} else {
				setError(
					err.response?.data?.message ||
						"Registration failed. Please try again."
				)
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-[calc(100vh-150px)] flex items-center justify-center px-4 py-12">
			<div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8">
				<h2 className="text-3xl font-extrabold text-center mb-8 bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
					Create Account
				</h2>

				{error && (
					<div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
						{error}
					</div>
				)}

				<form
					onSubmit={submit}
					className="space-y-4">
					<input
						type="text"
						placeholder="Full name"
						className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>

					<input
						type="email"
						placeholder="Email address"
						className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>

					<input
						type="password"
						placeholder="Password (min 6 characters)"
						className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
						value={pw}
						onChange={(e) => setPw(e.target.value)}
						required
					/>

				<button
					type="submit"
					disabled={loading}
					className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold">
					{loading ? "Creating account..." : "Sign Up"}
				</button>
				</form>

				<div className="mt-6 relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-white/20"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="px-2 bg-slate-800 text-gray-400">
							Or
						</span>
					</div>
				</div>

				<a
					href={import.meta.env.VITE_API_URL + "/api/auth/google"}
					className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition font-semibold">
					<svg className="w-5 h-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Sign up with Google
				</a>

				<p className="mt-6 text-center text-gray-400 text-sm">
					Already have an account?{" "}
					<a
						href="/auth/login"
						className="text-purple-400 hover:text-purple-300 font-semibold">
						Log in
					</a>
				</p>
			</div>
		</div>
	)
}
