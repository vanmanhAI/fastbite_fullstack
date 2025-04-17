import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Khởi tạo Gemini API Client
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('GEMINI_API_KEY không được cấu hình trong file .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Cấu hình các thông số an toàn
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Cấu hình hệ thống AI chatbot
const chatSystemPrompt = process.env.CHATBOT_SYSTEM_PROMPT || 
  "Bạn là trợ lý ảo FastBite, giúp người dùng đặt đồ ăn, trả lời câu hỏi về menu, khuyến mãi và dịch vụ. Luôn trả lời lịch sự, ngắn gọn và hữu ích. Chỉ trả lời các câu hỏi liên quan đến nhà hàng, đồ ăn và dịch vụ.";

const maxChatHistory = parseInt(process.env.CHATBOT_MAX_HISTORY || '20');

// Tạo và xuất model
const geminiProModel = genAI.getGenerativeModel({
  model: 'gemini-pro',
  safetySettings,
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 1024,
  },
});

export { geminiProModel, chatSystemPrompt, maxChatHistory }; 