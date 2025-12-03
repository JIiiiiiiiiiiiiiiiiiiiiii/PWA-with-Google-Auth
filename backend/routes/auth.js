const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require("../models/User")
require("dotenv").config()

const router = express.Router()

function issueToken(res, user) {
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not configured")
	}
	if (!user || !user._id) {
		throw new Error("Invalid user object")
	}
	const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
		expiresIn: "7d",
	})
	res.cookie("token", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	})
}

// Local register
router.post("/register", async (req, res) => {
	try {
		const { name, email, password } = req.body
		if (!email || !password)
			return res.status(400).json({ message: "Missing" })
		const exists = await User.findOne({ email })
		if (exists) return res.status(400).json({ message: "User exists" })
		const hash = await bcrypt.hash(password, 10)
		const user = new User({ name, email, passwordHash: hash })
		await user.save()
		issueToken(res, user)
		res.json({ ok: true })
	} catch (err) {
		console.error("Register error:", err)
		res.status(500).json({ message: err.message })
	}
})

// Local login
router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body
		
		if (!email || !password) {
			return res.status(400).json({ message: "Email and password are required" })
		}

		// Check if JWT_SECRET is configured
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not configured")
			return res.status(500).json({ message: "Server configuration error" })
		}

		const user = await User.findOne({ email })
		if (!user) {
			return res.status(400).json({ message: "Invalid email or password" })
		}

		// Check if user has a password (not a Google-only account)
		if (!user.passwordHash) {
			return res.status(400).json({ 
				message: "This account uses Google login. Please sign in with Google." 
			})
		}

		const valid = await bcrypt.compare(password, user.passwordHash)
		if (!valid) {
			return res.status(400).json({ message: "Invalid email or password" })
		}

		issueToken(res, user)
		res.json({ ok: true })
	} catch (err) {
		console.error("Login error:", err)
		res.status(500).json({ 
			message: err.message || "Internal server error. Please try again later." 
		})
	}
})

// Logout
router.post("/logout", (req, res) => {
	// Clear cookie with same options as when it was set
	res.clearCookie("token", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/"
	})
	res.json({ ok: true })
})

// Get me
router.get("/me", async (req, res) => {
	const token = req.cookies?.token
	if (!token) return res.json({ user: null })
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		const user = await User.findById(payload.id).select("-passwordHash")
		res.json({ user })
	} catch (err) {
		res.json({ user: null })
	}
})

// Passport Google
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.GOOGLE_CALLBACK,
		},
		async (accessToken, refreshToken, profile, done) => {
			const email = profile.emails?.[0]?.value
			let user =
				(await User.findOne({ googleId: profile.id })) ||
				(await User.findOne({ email }))
			if (!user) {
				user = new User({
					name: profile.displayName,
					email,
					googleId: profile.id,
				})
				await user.save()
			} else if (!user.googleId) {
				user.googleId = profile.id
				await user.save()
			}
			done(null, user)
		}
	)
)

router.get(
	"/google",
	passport.authenticate("google", { scope: ["profile", "email"] })
)
router.get(
	"/google/callback",
	passport.authenticate("google", { session: false, failureRedirect: "/" }),
	(req, res) => {
		issueToken(res, req.user)
		// redirect to frontend
		res.redirect(process.env.CLIENT_ORIGIN + "/dashboard")
	}
)

module.exports = router
