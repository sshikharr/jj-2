import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chat.js";
import imageChatRoutes from "./routes/document.js";
import legaldocs from "./routes/legaldocs.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://juristo-sigma.vercel.app",
    "http://localhost:3000",
    "http://localhost:5911",
    "http://localhost:8541",
    "https://juristo-prod.vercel.app",
    "https://juristo.onrender.com",
    "https://juristobot.vercel.app",
    "https://www.chat.juristo.in",
    "https://chat.juristo.in",
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Explicitly handle preflight requests
app.options("*", cors());
// Database connection
connectDB();

// Middleware for parsing body and cookies
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/image-chat", imageChatRoutes);
app.use("/api/legaldocs", legaldocs);

// Test route
app.get("/", (req, res) => {
  res.send("Helloo");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
