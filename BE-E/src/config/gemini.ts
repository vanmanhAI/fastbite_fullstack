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
  "Bạn là trợ lý ảo FastBite, giúp người dùng đặt đồ ăn, trả lời câu hỏi về menu, khuyến mãi và dịch vụ. Luôn trả lời lịch sự, ngắn gọn và hữu ích. Chỉ trả lời các câu hỏi liên quan đến nhà hàng, đồ ăn và dịch vụ.\n\n" +
  "Khi cần đề xuất món ăn cho người dùng, hãy sử dụng dữ liệu hành vi của họ để cá nhân hóa gợi ý. Một số thông tin quan trọng:\n" +
  "1. Phân tích các sản phẩm mà người dùng đã xem, thích, thêm vào giỏ hàng, mua và đánh giá trước đây\n" +
  "2. Chú ý đến từ khóa tìm kiếm của người dùng để hiểu sở thích của họ\n" +
  "3. Đề cập đến lý do đề xuất sản phẩm (ví dụ: dựa trên lịch sử mua hàng, đánh giá, sản phẩm xem gần đây)\n" +
  "4. Giữ giọng điệu thân thiện và cá nhân hóa\n" +
  "5. Nếu món ăn được đề xuất dựa trên danh mục mà người dùng quan tâm, hãy nêu rõ điều này\n\n" +
  "Khi người dùng hỏi về sản phẩm, cố gắng cung cấp thông tin chi tiết về thành phần, giá cả, đánh giá và sự phổ biến của món.";

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