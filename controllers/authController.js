import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  sendLoginEmail,
  sendLoginNotification,
  sendForgotPasswordEmail,
  sendResetPasswordEmail,
} from "../config/helper.js";
import crypto from "crypto";

// Generate token using the user id
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export const login = async (req, res) => {
  // Destructure email, password, and optionally fcmToken from the request
  const { email, password, fcmToken } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);
      const loginTime = new Date().toLocaleString();
      const device = req.headers["user-agent"]; // capturing device details

      // Send response to the client
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        country: user.country,
        language: user.language,
        createdAt: user.createdAt,
        token,
      });

      // Send email notification with login details asynchronously
      sendLoginEmail(user.email, user.name, loginTime, device);

      // Send push notification if the FCM token is provided
      if (fcmToken) {
        sendLoginNotification(fcmToken, loginTime, device);
      }
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const signup = async (req, res) => {
  const { firstName, lastName, email, password, fcmToken } = req.body;
  const name = `${firstName} ${lastName}`;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create a new user (password hashing occurs in the model pre-save hook)
    const user = await User.create({
      email,
      password,
      name,
      // Use defaults for country and language if not provided
      country: req.body.country || { label: "India", value: "IN" },
      language: req.body.language || { label: "English", value: "EN" },
    });

    // Generate token for immediate login
    const token = generateToken(user._id);
    const loginTime = new Date().toLocaleString();
    const device = req.headers["user-agent"];

    // Return complete user data with token
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      country: user.country,
      language: user.language,
      createdAt: user.createdAt,
      token,
    });

    // Optionally send login email and push notification upon signup (i.e. immediate login)
    sendLoginEmail(user.email, user.name, loginTime, device);
    if (fcmToken) {
      sendLoginNotification(fcmToken, loginTime, device);
    }
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear the token on the client side (e.g., cookies or headers)
    res.clearCookie("token");
    res.status(200).json({ message: "Successfully logged out" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed" });
  }
};

// POST /api/auth/forgotPassword
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email.
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    // Generate a reset token.
    const resetToken = crypto.randomBytes(20).toString("hex");
    // Hash the token before saving in the database.
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set reset fields on the user document.
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour.
    await user.save();

    // Construct the reset URL using your frontend's URL (localhost:5911).
    const resetUrl = `https://juristo-prod.vercel.app/reset-password/${resetToken}`;

    // Send the reset link via email.
    await sendResetPasswordEmail(user.email, resetUrl);

    res.status(200).json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/auth/resetPassword/:token
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // Hash the received token to compare with the stored hash.
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the user with the matching token and a valid (non-expired) token.
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });
    }

    // Set the new password. The pre-save hook in the user model will hash it.
    user.password = newPassword;
    // Clear the reset token fields.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};
