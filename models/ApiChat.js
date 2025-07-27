import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  }
});

const chatEntrySchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  messages: [messageSchema]
});

const apiChatSchema = new mongoose.Schema({
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  chats: {
    type: Map,
    of: [chatEntrySchema],
    default: new Map()
  }
}, { timestamps: true });

const ApiChat = mongoose.model('ApiChat', apiChatSchema);

export default ApiChat;
