// controllers/chatController.js
import { generateResponse, generateTitle } from "../../controllers/chatController.js";
import ApiChat from "../../models/ApiChat.js";

const chatController = async (req, res) => {
    console.log("Req body:", req.body);

    try {
        await handleChat(req, res);
    } catch (error) {
        console.error("Error in chat API:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const handleChat = async (req, res) => {
  const { message, language, country, context, chatId } = req.body;
  const { apiKey } = req.query;

  if (!apiKey || !message || !country || !language) {
    return res.status(400).json({ message: "API key, message, country, and language are required." });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    let apiChatDoc = await ApiChat.findOne({ apiKey });
    if (!apiChatDoc) {
      apiChatDoc = new ApiChat({
        apiKey,
        chats: {},
      });
    }

    if (!apiChatDoc.chats.has(today)) {
      apiChatDoc.chats.set(today, []);
    }

    // Variables for holding chat data
    let existingChat = null;
    let existingMessages = [];
    let newChatId = chatId;
    let chatTitle = "";

    // If chatId is provided, try to find the existing chat
    if (chatId) {
      // Search through all dates for the specified chatId
      for (const [date, chats] of apiChatDoc.chats.entries()) {
        existingChat = chats.find(chat => chat.chatId === chatId);
        if (existingChat) {
          // Extract messages from existing chat, excluding the system message
          existingMessages = existingChat.messages.filter(msg => msg.role !== 'system');
          chatTitle = existingChat.title;
          break;
        }
      }

      if (!existingChat) {
        return res.status(404).json({ message: "Chat not found with the provided chatId." });
      }
    }

    const chatMessages = [
      {
        role: "system",
        content: `You are a Legal AI Assistant specializing in law...`,
      },
      ...(existingMessages.length > 0 ? existingMessages : (context || [])),
      { role: "user", content: message },
    ];

    // Get response as string
    const responseContent = await generateResponse(chatMessages);
    
    // Add assistant's response to chat messages
    chatMessages.push({ role: "assistant", content: responseContent });

    if (existingChat) {
      // Update existing chat with new messages
      existingChat.messages = chatMessages;
      apiChatDoc.markModified('chats');
    } else {
      // Generate title for the new chat
      chatTitle = await generateTitle(message);
      
      // Create new chat entry
      newChatId = `CID${Date.now()}`;
      const chatEntry = {
        chatId: newChatId,
        title: chatTitle,
        messages: chatMessages,
      };

      const todayChats = apiChatDoc.chats.get(today);
      todayChats.push(chatEntry);
      apiChatDoc.markModified('chats');
    }

    await apiChatDoc.save();

    return res.json({
      title: chatTitle,
      response: responseContent,
      chatId: newChatId,
    });
  } catch (error) {
    console.error("Error in handleChat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default chatController;


