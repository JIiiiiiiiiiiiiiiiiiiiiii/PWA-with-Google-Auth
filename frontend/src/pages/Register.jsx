import { useState } from "react"
import { apiPost } from "../utils/api"

export default function Register() {
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [pw, setPw] = useState("")

	const submit = async (e) => {
		e.preventDefault()
		try {
			await apiPost("/api/auth/register", { name, email, password: pw })
			window.location.href = "/dashboard"
		} catch {
			alert("Registration failed")
		}
	}

	return (
		<div className="bg-white shadow-lg rounded-xl p-8 max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">
				Create Account
			</h2>

			<form
				onSubmit={submit}
				className="space-y-4">
				<input
					placeholder="Name"
					className="w-full p-3 rounded bg-gray-100 border"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

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
					Register
				</button>
			</form>
		</div>
	)
}
