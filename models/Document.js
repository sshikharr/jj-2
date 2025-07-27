import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    chatId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    uploadedContent: { type: String, required: false },
    messages: [messageSchema],
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", DocumentSchema);

export default Document;