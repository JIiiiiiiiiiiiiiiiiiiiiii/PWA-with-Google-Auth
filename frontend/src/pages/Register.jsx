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
			setError(
				err.response?.data?.message ||
					"Registration failed. Please try again."
			)
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
