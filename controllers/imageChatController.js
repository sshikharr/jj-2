import Document from "../models/Document.js";
import Tesseract from "tesseract.js";
import { createRequire } from "module";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a title for the chat using Gemini Pro
 */
const generateTitle = async (message) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });
    const result = await model.generateContent({
      contents: [
        {
          role: "user", // Use "user" instead of "system"
          parts: [
            {
              text: `Based on the chat content, provide one single, clear, and concise title. Do not offer multiple options or any extra explanation—just output one title in one sentence.: ${message}`,
            },
          ],
        },
      ],
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating title:", error);
    throw new Error("Failed to generate title");
  }
};

/**
 * Handle Image Chat Endpoint
 */
export const handleImageChat = async (req, res) => {
  try {
    const inputFile = req.file;
    const { userId } = req.body;

    if (!inputFile || !userId) {
      return res.status(400).json({ error: "File and User ID are required." });
    }

    let extractedText = "";

    if (inputFile.mimetype === "application/pdf") {
      const pdfData = await pdfParse(inputFile.buffer);
      extractedText = pdfData.text;
    } else if (inputFile.mimetype.startsWith("image/")) {
      const {
        data: { text },
      } = await Tesseract.recognize(inputFile.buffer, "eng");
      extractedText = text;
    } else {
      return res.status(400).json({
        error: "Unsupported file type. Please upload an image or PDF.",
      });
    }

    const newChatId = new mongoose.Types.ObjectId().toString();
    const title = await generateTitle(extractedText);

    const chat = new Document({
      title: title,
      chatId: newChatId,
      userId,
      uploadedContent: extractedText,
      messages: [],
    });

    await chat.save();

    res.status(200).json({
      message: "Analyzed successfully.",
      chatId: newChatId,
      chat,
    });
  } catch (error) {
    console.error("Error in handleImageChat:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the file." });
  }
};

/**
 * Handle User Question Endpoint
 */
export const handleUserQuestion = async (req, res) => {
  try {
    const { userId, chatId, question } = req.body;

    if (!userId || !chatId || !question) {
      return res
        .status(400)
        .json({ error: "User ID, chat ID, and question are required." });
    }

    const chat = await Document.findOne({ chatId, userId });

    if (!chat) {
      return res.status(404).json({ error: "Chat session not found." });
    }

    const context = chat.uploadedContent;

    const messages = [
      {
        role: "user",
        parts: [
          {
            text: "You are an assistant answering questions based on the uploaded document.",
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: `Document Content: ${context}` }],
      },
      {
        role: "user",
        parts: [{ text: `Question: ${question}` }],
      },
    ];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });
    const result = await model.generateContent({
      contents: messages,
    });

    const response = await result.response;
    const answer = response.text();

    chat.messages.push({ role: "user", content: question });
    chat.messages.push({ role: "assistant", content: answer });

    await chat.save();

    res.status(200).json({ answer, chat });
  } catch (error) {
    console.error("Error in handleUserQuestion:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request." });
  }
};

/**
 * Get All Chats for a User
 */
export const getAllChats = async (req, res) => {
  const { userId } = req.params;
  try {
    const chats = await Document.find({ userId });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Find Chat by ID
 */
export const findChatById = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Document.findOne({ chatId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.status(200).json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete Chat by ID
 */
export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Document.findOneAndDelete({ chatId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
