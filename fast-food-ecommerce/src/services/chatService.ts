import axios from 'axios';

// API endpoint cho chatbot
const CHAT_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/chat`;

/**
 * Interface cho tin nhắn chat
 */
export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp?: Date;
}

/**
 * Gửi tin nhắn đến chatbot API
 * @param message Nội dung tin nhắn người dùng
 * @param chatHistory Lịch sử chat (tuỳ chọn)
 */
export async function sendMessage(message: string, chatHistory?: ChatMessage[]): Promise<string> {
  try {
    console.log('Gửi tin nhắn đến chatbot API:', message);
    
    const response = await axios.post(`${CHAT_API_URL}/chatbot`, {
      message,
      chatHistory
    });
    
    if (response.data && response.data.response) {
      return response.data.response;
    }
    
    return response.data.chat?.response || 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.';
  } catch (error) {
    console.error('Lỗi khi gọi chatbot API:', error);
    
    // Thử gọi API trực tiếp với vai trò là DB query
    try {
      const directResponse = await axios.post(`${CHAT_API_URL}/ai/query`, {
        question: message
      });
      
      if (directResponse.data && directResponse.data.response) {
        return directResponse.data.response;
      }
      
      return 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.';
    } catch (directError) {
      console.error('Lỗi khi gọi API trực tiếp:', directError);
      return 'Xin lỗi, tôi không thể kết nối đến máy chủ lúc này. Vui lòng thử lại sau.';
    }
  }
}

/**
 * Lấy lịch sử chat (nếu đăng nhập)
 * @param page Số trang
 * @param limit Số lượng tin nhắn mỗi trang
 */
export async function getChatHistory(
  page: number = 1,
  limit: number = 20
): Promise<{ chats: any[], pagination: any }> {
  try {
    const response = await axios.get(`${CHAT_API_URL}/history`, {
      params: { page, limit },
      withCredentials: true // Cần đính kèm cookie cho xác thực
    });
    
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử chat:', error);
    return { chats: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
}

export default {
  sendMessage,
  getChatHistory
}; 