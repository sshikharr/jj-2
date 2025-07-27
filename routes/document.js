import express from "express";
import multer from "multer";
import { deleteChat, findChatById, getAllChats, handleImageChat, handleUserQuestion } from "../controllers/imageChatController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/:userId", getAllChats);
router.get("/:chatId", findChatById)
router.post("/process-file", upload.single("image"), handleImageChat);
router.post("/chat", handleUserQuestion);
router.delete("/:chatId", deleteChat)

export default router;
