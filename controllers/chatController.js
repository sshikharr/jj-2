import axios from "axios";
import Chat from "../models/Chat.js";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = "AIzaSyBQUOZCQrzgCXM0dbg2qtyHbsy80r-Vj9A";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Configure marked with plugins
marked.use(gfmHeadingId());
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

/**
 * Generate a response using Gemini 2.0 Flash via HTTP API
 * @param {Array} messages - Array of message objects with role and content
 */
export const generateResponse = async (messages) => {
  try {
    // Convert your messages array to the API format:
    const contents = messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const res = await axios.post(GEMINI_API_URL, {
      contents,
    });

    const candidates = res.data?.candidates || [];
    const responseText =
      candidates[0]?.content?.parts?.[0]?.text || "No response";
    return responseText;
  } catch (error) {
    console.error(
      "GenerateResponse API error:",
      error.response?.data || error.message
    );
    throw new Error("Gemini API failed");
  }
};

/**
 * Generate a title for the chat using Gemini 2.0 Flash via HTTP API
 * @param {string} message - Message text to generate title from
 */
export const generateTitle = async (message) => {
  try {
    const res = await axios.post(GEMINI_API_URL, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Based on the chat content, provide one single, clear, and concise title. Do not offer multiple options or any extra explanation—just output one title in one sentence.: ${message}`,
            },
          ],
        },
      ],
    });

    const candidates = res.data?.candidates || [];
    const title = candidates[0]?.content?.parts?.[0]?.text || "Untitled";
    return title;
  } catch (error) {
    console.error(
      "GenerateTitle API error:",
      error.response?.data || error.message
    );
    throw new Error("Gemini Title Generation Failed");
  }
};

/**
 * Handle Chat Endpoint using new generateResponse and generateTitle
 */
export const handleChat = async (req, res) => {
  const { message, newChat, chatId, userId, country, language } = req.body;
  let cid = chatId;

  if (!message || !country || !language) {
    return res
      .status(400)
      .json({ message: "Message, country, and language are required." });
  }

  try {
    // Create new chat ID if new chat or no chatId given
    if (newChat || !chatId) {
      cid = `CID${Date.now()}`;
    }

    let chat = await Chat.findOne({ chatId: cid });

    if (!chat) {
      const title = await generateTitle(message);
      chat = new Chat({
        title,
        chatId: cid,
        userId: userId,
        messages: [
          {
            role: "user",
            content: `You are a Legal AI Assistant named Juristo specializing in Indian and international law. Your sole purpose is to assist with legal tasks and queries also give answers in a proper format with points,new line and spaces as required so that it can be in more readable format, including:
1. Legal Research and Case Analysis: Analyze legal queries, retrieve relevant statutes, case laws, and precedents, and provide concise summaries. Compare the laws of ${country} with international frameworks if applicable.
2. Document Drafting and Review: Draft legal documents such as contracts, agreements, and wills for ${country}. Suggest clauses, ensure compliance with ${country}'s regulations, and review documents for inconsistencies or risks.
3. Case Prediction and Legal Analytics: Predict case outcomes based on historical data and similar precedents in ${country}. Provide insights into trends in legal decisions and emerging areas of law.
4. Cross-Border Legal Guidance: Offer comparisons of ${country}'s laws with other jurisdictions. Help ensure compliance with cross-border regulations.
5. Legal Aid and Pro Bono Services: Explain legal concepts in simple terms relevant to ${country}. Provide guidance on basic legal steps and refer to professional services if needed.
6. Continuous Legal Education: Summarize recent judgments, new regulations, and global case studies impacting ${country}'s laws.
7. Court Process Automation: Draft notices, orders, and other court documents compliant with ${country}'s judiciary processes. Suggest ways to streamline workflows.
8. Alternative Dispute Resolution (ADR) Assistance: Summarize arguments for parties in arbitration or mediation in ${country} and suggest resolutions based on local practices.
9. Compliance and Risk Management: Assess compliance with ${country}'s regulations for business operations. Identify risks and recommend mitigation strategies.
10. Multilingual and Multijurisdictional Support: Translate legal documents into different languages while maintaining legal context for ${country}. Tailor advice based on its jurisdiction-specific requirements.
11. Ethical and Secure Legal AI: Provide guidance on data privacy laws in ${country}, such as local data protection acts or international equivalents. Ensure ethical and secure AI usage in legal practices.
12. Integration with Legal Practice Management Systems: Suggest workflows for automating legal processes, ensuring seamless integration with existing systems in ${country}.
Please respond in ${language}. Outputs should be concise and relevant to ${country}'s legal framework and the user's query.`,
          },
        ],
      });
    }

    // Add user's message to chat
    chat.messages.push({ role: "user", content: message });

    // Generate assistant's response using updated generateResponse
    const assistantResponse = await generateResponse(chat.messages);

    // Save assistant's response
    chat.messages.push({
      role: "assistant",
      content: assistantResponse.toString(),
    });

    await chat.save();

    res.send({ response: assistantResponse, chat });
  } catch (error) {
    console.error("Chat Error:", error);

    if (
      error.message.includes("Server is busy") ||
      error.message.includes("rate limit") ||
      error.message.includes("API key")
    ) {
      res
        .status(503)
        .json({ message: "Server is busy right now. Please try again later." });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

/**
 * Get All Chats for a User
 */
export const getAllChats = async (req, res) => {
  const { userId } = req.params;
  try {
    const chats = await Chat.find({ userId });
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
    const chat = await Chat.findOne({ chatId });
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
    const chat = await Chat.findOneAndDelete({ chatId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
