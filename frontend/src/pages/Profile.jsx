import { apiPost } from "../utils/api"

export default function Profile({ user }) {
	const logout = async () => {
		await apiPost("/api/auth/logout")
		window.location.href = "/"
	}

	return (
		<div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-4">Profile</h2>

			<p>
				<strong>Name:</strong> {user.name}
			</p>
			<p className="mt-2">
				<strong>Email:</strong> {user.email}
			</p>

			<button
				onClick={logout}
				className="mt-6 w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700">
				Logout
			</button>
		</div>
	)
}
