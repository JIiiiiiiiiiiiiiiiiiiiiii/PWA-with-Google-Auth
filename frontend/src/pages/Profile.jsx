import { apiPost } from "../utils/api"

export default function Profile({ user }) {
	const logout = async () => {
		await apiPost("/api/auth/logout")
		window.location.href = "/"
	}

	return (
		<div className="min-h-[calc(100vh-150px)] flex items-center justify-center px-4 py-12">
			<div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8">
				<h2 className="text-3xl font-extrabold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">
					My Profile
				</h2>

				<div className="space-y-4 mb-8">
					<div className="bg-white/5 rounded-lg p-4 border border-white/10">
						<label className="block text-xs font-semibold text-gray-400 mb-1">
							Name
						</label>
						<p className="text-lg font-semibold text-white">
							{user.name}
						</p>
					</div>
					<div className="bg-white/5 rounded-lg p-4 border border-white/10">
						<label className="block text-xs font-semibold text-gray-400 mb-1">
							Email
						</label>
						<p className="text-lg font-semibold text-white break-all">
							{user.email}
						</p>
					</div>
				</div>

				<button
					onClick={logout}
					className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg hover:shadow-red-500/50 hover:scale-[1.02] transition-all font-semibold">
					Logout
				</button>

				<div className="mt-6 text-center text-gray-400 text-sm">
					<p>
						Logged in since{" "}
						{new Date(user.createdAt).toLocaleDateString()}
					</p>
				</div>
			</div>
		</div>
	)
}
