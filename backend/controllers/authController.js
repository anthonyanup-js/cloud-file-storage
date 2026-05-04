import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }

        const user = await User.create({ name, email, password });

        generateToken(user._id, res);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
        });
    } catch (error) {
        console.error("Signup error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        generateToken(user._id, res);

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Stateless logout — just clear the cookie, no DB interaction
export const logout = (req, res) => {
    res.cookie("jwt", "", { maxAge: 0 });
    res.json({ message: "Logged out successfully" });
};

export const checkAuth = (req, res) => {
    // req.user is set by the protectRoute middleware
    res.json(req.user);
};
