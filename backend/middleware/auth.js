import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized — no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({ message: "Unauthorized — user not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);
        return res.status(401).json({ message: "Unauthorized — invalid token" });
    }
};

export default protectRoute;
