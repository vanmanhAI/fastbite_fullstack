import axios from 'axios';
import recommendationService, { RecommendationRequest } from './recommendationService';
import { API_URL, BACKEND_API_URL, CHATBOT_CONFIG } from '@/lib/api-config';
import { v4 as uuidv4 } from 'uuid';

// API endpoint cho chatbot
const CHAT_API_URL = `${API_URL}/chat`;
const BACKEND_CHAT_API_URL = `${BACKEND_API_URL}/api/chat`;

// Hàm lấy hoặc tạo chatSessionId
export function getChatSessionId(): string {
  if (typeof window === 'undefined') return 'default';
  
  let sessionId = localStorage.getItem('chatbot_session_id');
  
  if (!sessionId) {
    // Nếu chưa có sessionId, tạo mới một ID
    sessionId = `session_${uuidv4()}`;
    localStorage.setItem('chatbot_session_id', sessionId);
  }
  
  return sessionId;
}

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
    confidence?: number;
    reasoning?: string;
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
 * Kiểm tra tùy chọn sử dụng backend hoặc local API
 */
function shouldUseBackend(): boolean {
  return CHATBOT_CONFIG.useBackend;
}

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
      const parsedMetadata = JSON.parse(metadataMatch[1]);
      
      // Xử lý đúng định dạng metadata
      if (parsedMetadata.type === 'product_carousel' && parsedMetadata.products) {
        // Đảm bảo tất cả sản phẩm đều có trường image thay vì imageUrl
        const products = parsedMetadata.products.map((product: any) => ({
          ...product,
          image: product.image || product.imageUrl || '/images/placeholder-food.jpg'
        }));
        
        metadata = {
          type: 'product_carousel',
          products
        };
      } else {
        // Giữ nguyên các loại metadata khác
        metadata = parsedMetadata;
      }
      
      // Loại bỏ metadata khỏi nội dung
      content = response.replace(/\n\n\[\[METADATA\]\].*?\[\[\/METADATA\]\]/s, '');
    } catch (error) {
      console.error('Lỗi khi phân tích metadata:', error);
    }
  }
  
  return { content, metadata };
}

/**
 * Phân tích ý định người dùng từ tin nhắn
 * @param message Tin nhắn người dùng
 * @returns Đối tượng chứa ý định và thông tin liên quan
 */
export async function analyzeUserIntent(message: string): Promise<{
  intent: 'recommendation' | 'product_query' | 'order_status' | 'general';
  entities: Record<string, any>;
  confidence: number;
}> {
  try {
    // Ưu tiên sử dụng API backend để phân tích ý định
    const response = await axios.post(`${CHAT_API_URL}/analyze-intent`, {
      message
    });
    
    if (response.data && response.data.success) {
      return {
        intent: response.data.intent,
        entities: response.data.entities || {},
        confidence: response.data.confidence || 0.5
      };
    }
    
    console.warn('API phân tích ý định không trả về kết quả hợp lệ, sử dụng phương pháp dự phòng');
    
    // Nếu không thể dùng API, gọi endpoint AI chung
    try {
      const aiResponse = await axios.post(`${CHAT_API_URL}/ai/query`, {
        question: `Phân tích ý định từ tin nhắn sau: "${message}"
        Trả về định dạng JSON chỉ bao gồm: 
        {
          "intent": "recommendation" | "product_query" | "order_status" | "general",
          "entities": { "keywords": ["từ khóa1", "từ khóa2"], "productIds": [], "categories": [] },
          "confidence": 0.0-1.0
        }`
      });
      
      if (aiResponse.data && aiResponse.data.success) {
        try {
          // Tìm JSON trong phản hồi
          const content = aiResponse.data.response;
          const jsonMatch = content.match(/\{.*\}/s);
          
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
              intent: result.intent || 'general',
              entities: result.entities || {},
              confidence: result.confidence || 0.5
            };
          }
        } catch (jsonError) {
          console.error('Lỗi khi phân tích JSON từ AI:', jsonError);
        }
      }
    } catch (aiError) {
      console.error('Lỗi khi gọi AI để phân tích ý định:', aiError);
    }
    
    // Fallback cuối cùng khi tất cả phương pháp khác đều thất bại
    return {
      intent: 'general',
      entities: { keywords: extractKeywords(message) },
      confidence: 0.5
    };
  } catch (error) {
    console.error('Lỗi khi phân tích ý định người dùng:', error);
    // Sử dụng phương pháp dự phòng nếu API lỗi
    return {
      intent: 'general',
      entities: { keywords: extractKeywords(message) },
      confidence: 0.5
    };
  }
}

/**
 * Trích xuất từ khóa từ tin nhắn người dùng
 * @param userInput Tin nhắn người dùng
 * @returns Chuỗi từ khóa đã lọc
 */
export function extractKeywords(userInput: string): string {
  try {
    // Loại bỏ các từ chung tiếng Việt và tiếng Anh
    const stopWords = [
      'gợi', 'ý', 'đề', 'xuất', 'món', 'gì', 'nào', 'muốn', 'ăn', 
      'recommend', 'tìm', 'kiếm', 'có', 'không', 'cho', 'tôi', 'xem', 
      'thử', 'thêm', 'bạn', 'ơi', 'nhé', 'và', 'hay', 'hoặc', 'là',
      'tại', 'vì', 'bởi', 'trong', 'ngoài', 'trên', 'dưới', 'với',
      'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'want', 'like', 'please', 'can', 'could', 'would', 'do', 'does',
      'give', 'show', 'find', 'search', 'looking'
    ];
    
    // Chuyển thành chữ thường và tách từ
    const words = userInput.toLowerCase().split(/\s+/);
    
    // Lọc các từ dừng
    const filteredWords = words.filter(word => 
      word.length > 1 && !stopWords.includes(word) && !/^\d+$/.test(word)
    );
    
    // Kết hợp lại thành chuỗi
    return filteredWords.join(' ');
  } catch (error) {
    console.error('Lỗi khi trích xuất từ khóa:', error);
    return userInput;
  }
}

/**
 * Lấy đề xuất cá nhân hóa cho tin nhắn của người dùng
 * @param query Nội dung tin nhắn của người dùng
 * @returns Danh sách các sản phẩm được đề xuất
 */
export async function getPersonalizedRecommendations(query: string): Promise<{
  products: any[];
  reasonings: string[];
}> {
  try {
    const token = localStorage.getItem(CHATBOT_CONFIG.tokenStorageKey);
    
    // Gọi API để lấy đề xuất cá nhân hóa
    const response = await axios.get(`${BACKEND_CHAT_API_URL}/personalized-recommendations`, {
      params: { query },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    if (response.data && response.data.success) {
      return {
        products: response.data.products || [],
        reasonings: response.data.reasonings || []
      };
    }
    
    return { products: [], reasonings: [] };
  } catch (error) {
    console.error('Lỗi khi lấy đề xuất cá nhân hóa:', error);
    return { products: [], reasonings: [] };
  }
}

/**
 * Lấy đề xuất dựa trên ngữ cảnh và hành vi người dùng
 */
export async function getContextAwareRecommendations(query: string): Promise<ProductMetadata['products']> {
  // Ưu tiên sử dụng API đề xuất cá nhân hóa từ backend
  if (shouldUseBackend()) {
    try {
      console.log('Sử dụng API backend cho đề xuất cá nhân hóa');
      const { products } = await getPersonalizedRecommendations(query);
      
      if (products && products.length > 0) {
        console.log(`Nhận được ${products.length} sản phẩm từ API backend`);
        return products;
      } else {
        console.warn('API backend không trả về sản phẩm, sử dụng phương pháp dự phòng');
      }
    } catch (error) {
      console.error('Lỗi khi lấy đề xuất cá nhân hóa từ backend:', error);
    }
  }
  
  // Xây dựng yêu cầu đề xuất dùng API
  const recommendationRequest: RecommendationRequest = {
    query: query,
    limit: 5,
    includeReasoning: true
  };
  
  try {
    // Lấy đề xuất cá nhân hóa
    const recommendations = await recommendationService.getPersonalizedRecommendations(recommendationRequest);
    
    // Lưu từ khóa tìm kiếm để cải thiện đề xuất trong tương lai
    await recommendationService.trackSearchQuery(query);
    
    // Chuyển đổi kết quả thành định dạng phù hợp
    return recommendations.products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.imageUrl || '/images/placeholder-food.jpg',
      stock: product.stock,
      category: product.category,
      confidence: product.confidence,
      reasoning: product.reasoning
    }));
  } catch (error) {
    console.error('Lỗi khi lấy đề xuất sản phẩm:', error);
    
    // Fallback: Gọi API chatbot trực tiếp trong trường hợp lỗi
    try {
      const response = await axios.post(`${CHAT_API_URL}/ai/query`, {
        question: `Gợi ý sản phẩm: ${query}`
      });
      
      if (response.data && response.data.success) {
        const { metadata } = parseResponseMetadata(response.data.response);
        
        if (metadata && metadata.type === 'product_carousel') {
          return metadata.products;
        }
      }
    } catch (err) {
      console.error('Lỗi khi gọi API fallback:', err);
    }
    
    return [];
  }
}

/**
 * Gửi tin nhắn đến chatbot API
 * @param message Nội dung tin nhắn người dùng
 * @param chatHistory Lịch sử chat (tuỳ chọn)
 */
export async function sendMessage(message: string, chatHistory?: ChatMessage[]): Promise<{content: string, metadata: MessageMetadata}> {
  try {
    console.log('Gửi tin nhắn đến chatbot API:', message);
    
    // Phân tích ý định người dùng
    const intentResult = await analyzeUserIntent(message);
    
    // Cấu hình chung cho request
    const sessionId = getChatSessionId();
    const token = localStorage.getItem(CHATBOT_CONFIG.tokenStorageKey);
    console.log('DEBUG - Token người dùng:', token ? `${token.substring(0, 15)}...` : 'Không có token');
    console.log('DEBUG - Token key:', CHATBOT_CONFIG.tokenStorageKey);
    console.log('DEBUG - Chat session ID:', sessionId);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    console.log('DEBUG - Headers:', JSON.stringify(headers));
    
    // Kiểm tra xem có sử dụng backend hay không
    if (shouldUseBackend()) {
      try {
        console.log('Sử dụng backend API cho chatbot');
        
        // Chuẩn bị payload với lịch sử chat nếu có
        const payload = {
          message,
          sessionId,
          intentData: intentResult,
          ...(chatHistory && chatHistory.length > 0 ? { chatHistory } : {})
        };
        
        console.log('Gửi payload đến backend:', payload);
        console.log('DEBUG - API URL:', `${BACKEND_CHAT_API_URL}/message`);
        
        const response = await axios.post(`${BACKEND_CHAT_API_URL}/message`, payload, { headers });
        
        console.log('DEBUG - Response status:', response.status);
        console.log('DEBUG - Response success:', response.data?.success);
        
        if (response.data && response.data.success) {
          const result = parseResponseMetadata(response.data.response);
          console.log('Nhận phản hồi từ backend:', result);
          return result;
        }
        
        // Trường hợp backend không trả về success
        console.warn('Backend không trả về kết quả hợp lệ, fallback to local API');
      } catch (backendError) {
        console.error('Lỗi khi gọi backend API:', backendError);
        console.log('Fallback to local API');
      }
    }
    
    // Nếu không sử dụng backend hoặc backend lỗi, dùng local API
    // Nếu ý định là đề xuất sản phẩm, xử lý đặc biệt
    if (intentResult.intent === 'recommendation' && intentResult.confidence > 0.7) {
      try {
        const products = await getContextAwareRecommendations(message);
        
        if (products && products.length > 0) {
          // Kiểm tra xem người dùng đã đăng nhập hay chưa
          const token = localStorage.getItem(CHATBOT_CONFIG.tokenStorageKey);
          const isAuthenticated = !!token;
          let responseText = '';
          
          // Tạo phản hồi thân thiện dựa trên trạng thái xác thực và dữ liệu sản phẩm
          if (!isAuthenticated) {
            responseText = `Chào bạn! Đây là một số món đang được yêu thích. Để nhận đề xuất phù hợp hơn với khẩu vị cá nhân, hãy đăng nhập để tôi có thể ghi nhớ sở thích của bạn nhé!`;
          } else {
            // Đánh giá mức độ cá nhân hóa dựa trên dữ liệu sản phẩm
            const hasPersonalization = products.some(product => 
              (product.reasoning && product.reasoning.includes('sở thích của bạn')) || 
              ((product as any).score && (product as any).score > 0.2)
            );
            
            if (hasPersonalization) {
              responseText = `Dựa trên sở thích và lịch sử của bạn, tôi đề xuất những món này:`;
            } else {
              responseText = `Chào bạn! Đây là một số món phổ biến mà bạn có thể thích. Hãy khám phá và cho tôi biết sở thích của bạn nhé!`;
            }
          }
          
          return {
            content: responseText,
            metadata: {
              type: 'product_carousel',
              products
            }
          };
        }
      } catch (recError) {
        console.error('Lỗi khi lấy đề xuất sản phẩm:', recError);
        // Tiếp tục xử lý bình thường nếu không thể lấy đề xuất
      }
    }
    
    // Gửi tin nhắn với thông tin ý định đến local API
    const response = await axios.post(`${CHAT_API_URL}/message`, {
      message,
      sessionId,
      intentData: intentResult,
      ...(chatHistory && chatHistory.length > 0 ? { chatHistory } : {})
    }, { headers });
    
    if (response.data && response.data.success) {
      return parseResponseMetadata(response.data.response);
    }
    
    return {
      content: 'Xin lỗi, tôi đang gặp sự cố khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.',
      metadata: null
    };
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn đến chatbot:', error);
    return {
      content: 'Xin lỗi, tôi không thể kết nối với máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại sau.',
      metadata: null
    };
  }
}

/**
 * Tạo gợi ý sản phẩm dựa trên yêu cầu của người dùng
 * @param prompt Yêu cầu của người dùng
 */
export async function generateProductRecommendations(prompt: string): Promise<any[]> {
  try {
    // Sử dụng dịch vụ đề xuất cá nhân hóa
    const products = await getContextAwareRecommendations(prompt);
    if (products && products.length > 0) {
      return products;
    }
    
    // Fallback: Gọi trực tiếp API AI nếu dịch vụ đề xuất không có kết quả
    const response = await axios.post(`${CHAT_API_URL}/ai/query`, {
      question: `Gợi ý sản phẩm phù hợp với yêu cầu sau: "${prompt}". 
      Trả về JSON chứa mảng sản phẩm với id, name, description, price, image.`
    });
    
    if (response.data && response.data.success) {
      const { metadata } = parseResponseMetadata(response.data.response);
      
      if (metadata && metadata.type === 'product_carousel') {
        return metadata.products;
      }
    }
    
    return []; // Trả về mảng rỗng nếu không có metadata sản phẩm
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
    // Kiểm tra cả local và backend API
    const useBackend = shouldUseBackend();
    
    try {
      if (useBackend) {
        // Kiểm tra backend API trước nếu được cấu hình
        console.log('Kiểm tra kết nối backend API:', `${BACKEND_CHAT_API_URL}/db-test`);
        const response = await axios.get(`${BACKEND_CHAT_API_URL}/db-test`, { timeout: 5000 });
        if (response.status === 200) {
          console.log('Kết nối backend API thành công');
          return true;
        }
      }
    } catch (backendError) {
      console.warn('Không thể kết nối đến backend API:', backendError);
    }
    
    // Kiểm tra local API
    console.log('Kiểm tra kết nối local API:', `${CHAT_API_URL}/db-test`);
    const response = await axios.get(`${CHAT_API_URL}/db-test`, { timeout: 5000 });
    
    return response.status === 200;
  } catch (error) {
    console.error('Lỗi khi kiểm tra kết nối chatbot:', error);
    return false;
  }
}

/**
 * Đồng bộ token với localStorage
 * Gọi khi người dùng đăng nhập hoặc đăng xuất
 */
export function syncAuthToken() {
  try {
    const token = localStorage.getItem(CHATBOT_CONFIG.tokenStorageKey);
    console.log('[DEBUG] Đồng bộ token chatbot:', token ? `${token.substring(0, 15)}...` : 'Không có');
    return !!token;
  } catch (error) {
    console.error('Lỗi khi đồng bộ token chatbot:', error);
    return false;
  }
}

export default {
  sendMessage,
  parseResponseMetadata,
  generateProductRecommendations,
  checkChatbotConnection,
  analyzeUserIntent,
  getContextAwareRecommendations,
  getPersonalizedRecommendations,
  syncAuthToken
}; 