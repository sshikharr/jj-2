import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define a schema for individual API keys.
const apiKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    expires: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Optional userId generated if not provided.
    userId: { type: String, unique: true, sparse: true },
    // Plan: basic (free), super, or advance.
    plan: {
      type: String,
      enum: ["basic", "super", "advance"],
      default: "basic",
    },
    country: {
      label: { type: String, default: "India" },
      value: { type: String, default: "IN" },
    },
    language: {
      label: { type: String, default: "English" },
      value: { type: String, default: "EN" },
    },
    draftCount: { type: Number, default: 0 },
    // Fields for secure password reset:
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // New field for managing API keys:
    apiKeys: { type: [apiKeySchema], default: [] },
    apiKey: {  
      type: String,
      unique: true,
      required: false,
    },
    subscription: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },
    requestCount: {
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    newsLetterSubscribed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // Generate a unique userId if not set.
  if (!this.userId) {
    this.userId = `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  // Hash the password if it has been modified.
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
