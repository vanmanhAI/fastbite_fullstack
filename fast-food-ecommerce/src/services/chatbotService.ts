

import axios from 'axios';

// API endpoint cho chatbot
const CHAT_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/chat`;

/**
 * Interface cho tin nhắn chat
 */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Interface cho metadata sản phẩm
 */
export interface ProductMetadata {
  type: 'product_carousel';
  products: Array<{
    id: number;
    name: string;
    description?: string;
    price: number;
    image: string;
    stock?: number;
    category?: string;
  }>;
}

/**
 * Interface cho metadata hành động
 */
export interface ActionMetadata {
  type: 'action';
  action: string;
  url: string;
}

/**
 * Type cho metadata trong tin nhắn
 */
export type MessageMetadata = ProductMetadata | ActionMetadata | null;

/**
 * Phân tích metadata từ phản hồi của API
 * @param response Phản hồi từ API
 * @returns Đối tượng chứa nội dung tin nhắn và metadata
 */
export function parseResponseMetadata(response: string): { content: string, metadata: MessageMetadata } {
  // Mặc định không có metadata
  let metadata: MessageMetadata = null;
  let content = response;
  
  // Tìm và trích xuất metadata nếu có
  const metadataMatch = response.match(/\[\[METADATA\]\](.*?)\[\[\/METADATA\]\]/s);
  
  if (metadataMatch && metadataMatch[1]) {
    try {
      // Phân tích metadata JSON
      metadata = JSON.parse(metadataMatch[1]) as MessageMetadata;
      
      // Loại bỏ metadata khỏi nội dung
      content = response.replace(/\n\n\[\[METADATA\]\].*?\[\[\/METADATA\]\]/s, '');
    } catch (error) {
      console.error('Lỗi khi phân tích metadata:', error);
    }
  }
  
  return { content, metadata };
}

/**
 * Gửi tin nhắn đến chatbot API
 * @param message Nội dung tin nhắn người dùng
 * @param chatHistory Lịch sử chat (tuỳ chọn)
 */
export async function sendMessage(message: string, chatHistory?: ChatMessage[]): Promise<{content: string, metadata: MessageMetadata}> {
  try {
    console.log('Gửi tin nhắn đến chatbot API:', message);
    
    const response = await axios.post(`${CHAT_API_URL}/message`, {
      message,
      sessionId: localStorage.getItem('chatSessionId') || 'default'
    });
    
    if (response.data && response.data.success && response.data.response) {
      // Phân tích metadata từ phản hồi
      return parseResponseMetadata(response.data.response);
    }
    
    // Trả về nội dung mặc định nếu không nhận được phản hồi đúng định dạng
    return { 
      content: 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.', 
      metadata: null 
    };
  } catch (error) {
    console.error('Lỗi khi gọi chatbot API:', error);
    
    // Thử gọi API trực tiếp với vai trò là DB query
    try {
      const directResponse = await axios.post(`${CHAT_API_URL}/ai/query`, {
        question: message
      });
      
      if (directResponse.data && directResponse.data.success && directResponse.data.response) {
        return parseResponseMetadata(directResponse.data.response);
      }
      
      return { 
        content: 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.', 
        metadata: null 
      };
    } catch (directError) {
      console.error('Lỗi khi gọi API trực tiếp:', directError);
      return { 
        content: 'Xin lỗi, tôi không thể kết nối đến máy chủ lúc này. Vui lòng thử lại sau.', 
        metadata: null 
      };
    }
  }
}

/**
 * Tạo gợi ý sản phẩm dựa trên yêu cầu của người dùng
 * @param prompt Yêu cầu của người dùng
 */
export async function generateProductRecommendations(prompt: string): Promise<any[]> {
  try {
    // Gửi yêu cầu gợi ý sản phẩm đến API
    const response = await axios.post(`${CHAT_API_URL}/ai/query`, {
      question: `Gợi ý sản phẩm: ${prompt}`
    });
    
    // Xử lý kết quả trả về
    if (response.data && response.data.success) {
      // Phân tích metadata từ phản hồi
      const { metadata } = parseResponseMetadata(response.data.response);
      
      // Kiểm tra nếu metadata có chứa thông tin sản phẩm
      if (metadata && metadata.type === 'product_carousel') {
        return metadata.products;
      }
      
      return []; // Trả về mảng rỗng nếu không có metadata sản phẩm
    }
    
    return []; // Mặc định trả về danh sách rỗng
  } catch (error) {
    console.error('Lỗi khi lấy gợi ý sản phẩm:', error);
    return []; // Trả về mảng rỗng trong trường hợp lỗi
  }
}

/**
 * Kiểm tra kết nối đến chatbot API
 */
export async function checkChatbotConnection(): Promise<boolean> {
  try {
    console.log('Kiểm tra kết nối API tại URL:', `${process.env.NEXT_PUBLIC_API_URL}/chat/db-test`);
    
    // Thử kết nối đến endpoint cụ thể của API
    const response = await axios.get(`${CHAT_API_URL}/db-test`, {
      timeout: 5000, // 5 giây timeout
    });
    
    return response.status === 200 && response.data && response.data.success;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error('Lỗi kết nối API: Máy chủ không hoạt động hoặc sai địa chỉ');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'TIMEOUT') {
        console.error('Lỗi kết nối API: Timeout');
      } else if (error.response) {
        console.error('Lỗi kết nối API: Máy chủ trả về lỗi', error.response.status, error.response.data);
      } else {
        console.error('Lỗi kết nối API không xác định:', error.message);
      }
    } else {
      console.error('Lỗi kết nối chatbot API:', error);
    }
    return false;
  }
}

export default {
  sendMessage,
  parseResponseMetadata,
  generateProductRecommendations,
  checkChatbotConnection
}; 