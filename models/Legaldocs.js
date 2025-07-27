import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: {
        type: String,
        required: true,
      },
    userInput: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Legaldocs = mongoose.model("LegalDocument", documentSchema);
