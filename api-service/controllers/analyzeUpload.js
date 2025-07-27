import { createRequire } from "module";
import Tesseract from "tesseract.js";
import { v4 as uuidv4 } from "uuid";
import NodeCache from "node-cache";

import { generateResponse, generateTitle } from "../../controllers/chatController.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const documentCache = new NodeCache({ stdTTL: 3600 });

export const analyzeDocument = async (req, res) => {
  try {
    const inputFile = req.file;

    if (!inputFile) {
      return res.status(400).json({ error: "File is required." });
    }

    let extractedText = "";

    if (inputFile.mimetype === "application/pdf") {
      const pdfData = await pdfParse(inputFile.buffer);
      extractedText = pdfData.text;
    } else if (inputFile.mimetype.startsWith("image/")) {
      const { data: { text } } = await Tesseract.recognize(inputFile.buffer, "eng");
      extractedText = text;
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload a PDF or image." });
    }

    console.log("Extracted text:", extractedText);

    const title = await generateTitle(extractedText.toString());

    const responseMessages = [
      {
        role: "system",
        content: "You are an assistant providing insights from uploaded documents.",
      },
      {
        role: "user",
        content: `Here is some context, I will ask questions from this: ${extractedText.toString()}`,
      },
    ];

    const documentId = uuidv4();

    documentCache.set(documentId, extractedText.toString());

    const content = await generateResponse(responseMessages);

    res.status(200).json({
        documentId,
        title,
        content: content,
    });
  } catch (error) {
    console.error("Error in analyzeDocument:", error);
    res.status(500).json({ error: "An error occurred while processing the file." });
  }
};

export const queryDocument = async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: "documentId and question are required." });
    }

    const context = documentCache.get(documentId);

    if (!context) {
      return res.status(404).json({ error: "No document context found for this documentId." });
    }

    const queryMessages = [
      {
        role: "system",
        content: "You are an assistant answering questions based on provided document context.",
      },
      { role: "user", content: `Context: ${context}` },
      { role: "user", content: `Question: ${question}` },
    ];

    const response = await generateResponse(queryMessages);

    res.status(200).json({ data: response });
  } catch (error) {
    console.error("Error in queryDocument:", error);
    res.status(500).json({ error: "An error occurred while processing the query." });
  }
};

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
      const { data: { text } } = await Tesseract.recognize(inputFile.buffer, "eng");
      extractedText = text;
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload an image or PDF." });
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
    res.status(500).json({ error: "An error occurred while processing the file." });
  }
};


export const handleUserQuestion = async (req, res) => {
  try {
    const { userId, chatId, question } = req.body;

    if (!userId || !chatId || !question) {
      return res.status(400).json({ error: "User ID, chat ID, and question are required." });
    }

    const chat = await Document.findOne({ chatId, userId });

    if (!chat) {
      return res.status(404).json({ error: "Chat session not found." });
    }

    const context = chat.uploadedContent;

    const messages = [
      { role: "system", content: "You are an assistant answering questions based on the uploaded document." },
      { role: "user", content: `Document Content: ${context}` },
      { role: "user", content: `Question: ${question}` },
    ];

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
    });

    const answer = response.choices[0].message.content;

    chat.messages.push({ role: "user", content: question });
    chat.messages.push({ role: "assistant", content: answer });
    await chat.save();

    res.status(200).json({ answer, chat });
  } catch (error) {
    console.error("Error in handleUserQuestion:", error);
    res.status(500).json({ error: "An error occurred while processing the request." });
  }
};