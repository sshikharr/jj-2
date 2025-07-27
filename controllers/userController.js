// backend/controllers/userController.js

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const createUser = async (req, res) => {
  const {
    email,
    name,
    password,
    country = { label: "India", value: "IN" },
    language = "English",
  } = req.body;

  const userId = `UID${Date.now()}`;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = new User({
      email,
      password,
      name,
      userId,
      country,
      language,
    });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const findUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const findUserByEmail = async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { email, name, country, language } = req.body;

  const updateData = {};
  if (email) updateData.email = email;
  if (name) updateData.name = name;
  if (country) updateData.country = country;
  if (language) updateData.language = language;

  try {
    const updatedUser = await User.findOneAndUpdate({ userId }, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePassword = async (req, res) => {
  const { newPassword } = req.body;
  const { userId } = req.params;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const user = await User.findOneAndUpdate(
      { userId: userId },
      {
        password: hashedPassword,
      }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOneAndDelete({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateDraftCount = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }
    // Increment the draft count
    const user = await User.findOneAndUpdate(
      { userId },
      { $inc: { draftCount: 1 } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ draftCount: user.draftCount });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const generateApiKey = async (req, res) => {
  const { userId } = req.params;  

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const apiKey = crypto.randomBytes(32).toString("hex"); 
    
    // Add to apiKeys array with current date and active status
    user.apiKeys.push({
      key: apiKey,
      expires: null, // No expiration
      active: true,
      createdAt: new Date()
    });
    
    // Keep the legacy apiKey field in sync for backward compatibility
    user.apiKey = apiKey;
    
    await user.save();

    res.status(200).json({ apiKey });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const validateApiKey = async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ message: "API key is required" });
  }

  try {
    // Check both the legacy apiKey field and the new apiKeys array
    const user = await User.findOne({
      $or: [
        { apiKey },
        { "apiKeys.key": apiKey, "apiKeys.active": true }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // If using the new apiKeys array, find the specific key
    const keyEntry = user.apiKeys.find(k => k.key === apiKey && k.active);
    
    // Check if key has expired (if it has an expiration date)
    if (keyEntry && keyEntry.expires && new Date() > keyEntry.expires) {
      return res.status(401).json({ message: "API key has expired" });
    }

    res.status(200).json({ 
      valid: true, 
      userId: user.userId,
      subscription: user.subscription
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
