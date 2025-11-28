import { useState } from "react"
import { apiPost } from "../utils/api"

export default function Login() {
	const [email, setEmail] = useState("")
	const [pw, setPw] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	const submit = async (e) => {
		e.preventDefault()
		setError("")
		setLoading(true)
		try {
			await apiPost("/api/auth/login", { email, password: pw })
			window.location.href = "/dashboard"
		} catch (err) {
			setError(
				err.response?.data?.message || "Login failed. Please try again."
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-[calc(100vh-150px)] flex items-center justify-center px-4 py-12">
			<div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8">
				<h2 className="text-3xl font-extrabold text-center mb-8 bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
					Welcome Back
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
						type="email"
						placeholder="Email address"
						className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>

					<input
						type="password"
						placeholder="Password"
						className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
						value={pw}
						onChange={(e) => setPw(e.target.value)}
						required
					/>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold">
						{loading ? "Logging in..." : "Login"}
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
					Login with Google
				</a>

				<p className="mt-6 text-center text-gray-400 text-sm">
					Don't have an account?{" "}
					<a
						href="/auth/register"
						className="text-blue-400 hover:text-blue-300 font-semibold">
						Sign up
					</a>
				</p>
			</div>
		</div>
	)
}
