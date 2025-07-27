// backend/routes/auth.js

import express from "express";
import {
  forgotPassword,
  login,
  logout,
  resetPassword,
  signup,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/logout", logout);
router.post("/forgotPassword", forgotPassword);

// Reset the password using the token.
router.put("/resetPassword/:token", resetPassword);

export default router;
