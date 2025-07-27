// backend/routes/users.js

import express from "express";
import {
  createUser,
  getAllUsers,
  updatePassword,
  deleteUser,
  findUserById,
  updateUser,
  findUserByEmail,
  generateApiKey,
  updateDraftCount,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/generate-api-key/:userId", generateApiKey);
router.post("/", createUser);
router.post("/updated", updateDraftCount);
router.get("/", getAllUsers);
router.get("/:userId", findUserById);
router.get("/get/:email", findUserByEmail);
router.put("/update/:userId", updateUser);
router.put("/forget/:userId", updatePassword);
router.delete("/:userId", deleteUser);

export default router;
