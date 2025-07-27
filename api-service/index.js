import express from "express";
import dotenv from "dotenv";
import multer from "multer";

import validateApiKey from "./middleware/validateApiKey.js";
import { rateLimiterMiddleware } from "./middleware/rateLimiter.js";
import updateDb from "./middleware/updateDB.js";

import { analyzeDocument, queryDocument } from "./controllers/analyzeUpload.js";
import { generateQuestions, createDocument } from "./controllers/draftingController.js";
import connectionDetails  from "./controllers/connectionController.js";

import chatController from "./controllers/chatController.js";
import connectDb from "../config/db.js";


dotenv.config();
const app = express();
app.use(express.json());
app.use(rateLimiterMiddleware);
app.use(updateDb);


const upload = multer({ storage: multer.memoryStorage() });

connectDb()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

app.get("/connection", validateApiKey, connectionDetails);

app.post("/chat", validateApiKey, chatController);

app.post(
  "/document",
  validateApiKey,
  upload.single("file"),
  analyzeDocument
);
app.post("/query", validateApiKey, queryDocument);

app.post("/drafting/questions", validateApiKey, generateQuestions);
app.post("/drafting/document", validateApiKey, createDocument);


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`API service running on port ${PORT}`));
