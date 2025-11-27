import { useState } from "react"
import { apiPost } from "../utils/api"

export default function Login() {
	const [email, setEmail] = useState("")
	const [pw, setPw] = useState("")

	const submit = async (e) => {
		e.preventDefault()
		try {
			await apiPost("/api/auth/login", { email, password: pw })
			window.location.href = "/dashboard"
		} catch {
			alert("Login failed")
		}
	}

	return (
		<div className="bg-white shadow-lg rounded-xl p-8 max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

			<form
				onSubmit={submit}
				className="space-y-4">
				<input
					type="email"
					placeholder="Email"
					className="w-full p-3 rounded bg-gray-100 border"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>

				<input
					type="password"
					placeholder="Password"
					className="w-full p-3 rounded bg-gray-100 border"
					value={pw}
					onChange={(e) => setPw(e.target.value)}
				/>

				<button className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
					Login
				</button>
			</form>

			<a
				className="block mt-4 text-center text-red-600 underline"
				href={import.meta.env.VITE_API_URL + "/api/auth/google"}>
				Login with Google
			</a>
		</div>
	)
}
