import express from "express";
import {
  createDocument,
  getAllDocumentsByUserId,
  generateQuestions,
} from "../controllers/legaldocsController.js";
const router = express.Router();
import cors from "cors";

router.use(cors());

router.post("/questions", generateQuestions);
router.post("/generate", cors(), createDocument);
router.get("/:userId", getAllDocumentsByUserId);

export default router;
