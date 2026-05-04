import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN,
        credentials: true,
    })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

// Health check
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "CloudDrive API is running" });
});

// Start server
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
