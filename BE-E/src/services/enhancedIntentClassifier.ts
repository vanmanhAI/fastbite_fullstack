import { AppDataSource } from "../config/database";
import { Category } from "../models/Category";

/**
 * Interface định nghĩa cấu trúc của ý định người dùng 
 */
export interface UserIntent {
  intent: 'recommendation' | 'food_recommendation' | 'product_search' | 'order_status' | 'category_search' | 'general';
  confidence: number;
  entities: any;
}

/**
 * Hàm kiểm tra nếu văn bản chứa ít nhất một từ khóa trong danh sách
 */
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

/**
 * Hàm phát hiện danh mục từ text
 */
async function detectCategory(message: string): Promise<string | null> {
  try {
    const lowerMsg = message.toLowerCase();
    const categoryRepository = AppDataSource.getRepository(Category);
    const categories = await categoryRepository.find();
    
    for (const category of categories) {
      if (lowerMsg.includes(category.name.toLowerCase())) {
        return category.name;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Lỗi khi phát hiện danh mục:', error);
    return null;
  }
}

/**
 * Trích xuất từ khóa từ văn bản
 */
function extractKeywords(text: string): string[] {
  // Phân tích cụm từ quan trọng trước
  const phrases = [];
  if (text.includes('muốn ăn')) phrases.push('muốn ăn');
  if (text.includes('thích ăn')) phrases.push('thích ăn');
  if (text.includes('món ngon')) phrases.push('món ngon');
  if (text.includes('gợi ý món')) phrases.push('gợi ý món');
  
  // Sau đó tách thành các từ đơn lẻ
  const singleWords = text.split(' ')
    .filter(word => word.length > 3)
    .filter(word => !['đang', 'không', 'được', 'những', 'nhưng', 'rằng', 'hoặc', 'cho', 'các', 'với'].includes(word));
  
  return [...phrases, ...singleWords];
}

/**
 * Trích xuất thực thể từ văn bản
 */
function extractEntities(text: string): any {
  const entities: any = {
    keywords: extractKeywords(text),
    context: {}
  };
  
  // Phát hiện các thực thể về thời gian
  if (text.includes('sáng') || text.includes('buổi sáng')) {
    entities.timeOfDay = 'breakfast';
  } else if (text.includes('trưa') || text.includes('buổi trưa')) {
    entities.timeOfDay = 'lunch';
  } else if (text.includes('tối') || text.includes('buổi tối')) {
    entities.timeOfDay = 'dinner';
  }
  
  // Phát hiện vị giác
  const tasteKeywords = {
    cay: ['cay', 'ớt', 'spicy'],
    ngọt: ['ngọt', 'đường', 'sweet'],
    mặn: ['mặn', 'muối', 'salty'],
    chua: ['chua', 'chanh', 'sour'],
    đắng: ['đắng', 'bitter'],
    umami: ['umami', 'đậm đà']
  };
  
  for (const [taste, keywords] of Object.entries(tasteKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      entities.taste = taste;
      break;
    }
  }
  
  return entities;
}

/**
 * Cải thiện phương thức phân loại ý định để nhận diện câu hỏi về sở thích
 * Cốt lõi của cải tiến là nhận diện ý định tôi thích ... thì phân loại là recommendation
 */
export const classifyEnhancedUserIntent = async (message: string): Promise<UserIntent> => {
  const lowerMsg = message.toLowerCase();
  
  console.log(`[ENHANCED_INTENT] Đang phân tích ý định cho: "${message}"`);
  
  // Mảng các từ khóa theo loại ý định
  const intentKeywords = {
    recommendation: [
      'đề xuất', 'gợi ý', 'recommend', 'món gì', 'có món',
      'ăn gì', 'món nào', 'ngon không', 'có gì ngon'
    ],
    food_recommendation: [
      'muốn ăn', 'thích ăn', 'gợi ý món', 'đề xuất món',
      'món ngon', 'nên ăn gì', 'ăn gì ngon', 'món gì ngon',
      'có món gì', 'món tôi thích', 'món phù hợp'
    ],
    preference_query: [
      'tôi thích', 'tôi ưa thích', 'tôi hay', 'thích gì', 
      'biết tôi thích', 'sở thích', 'tôi thường', 'tôi hay dùng',
      'tôi hay mua', 'tôi hay ăn', 'tôi hay uống'
    ],
    category_specific: {
      drinks: ['nước uống', 'đồ uống', 'thức uống', 'nước gì'],
      foods: ['đồ ăn', 'thức ăn', 'món ăn', 'đồ ăn gì']
    }
  };
  
  // Log từ khóa tìm thấy trong mỗi loại
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (intent !== 'category_specific') {
      const matchedKeywords = (keywords as string[]).filter(kw => lowerMsg.includes(kw));
      if (matchedKeywords.length > 0) {
        console.log(`[ENHANCED_INTENT] Tìm thấy từ khóa "${intent}": ${matchedKeywords.join(', ')}`);
      }
    }
  }
  
  // Phát hiện danh mục cụ thể (nước uống/đồ ăn)
  let specificCategory = null;
  if (containsAny(lowerMsg, intentKeywords.category_specific.drinks)) {
    specificCategory = 'drink';
    console.log("[ENHANCED_INTENT] Phát hiện danh mục: NƯỚC UỐNG");
  } else if (containsAny(lowerMsg, intentKeywords.category_specific.foods)) {
    specificCategory = 'food';
    console.log("[ENHANCED_INTENT] Phát hiện danh mục: MÓN ĂN");
  }
  
  // Kiểm tra các cụm từ ưu tiên về sở thích người dùng
  if (containsAny(lowerMsg, intentKeywords.preference_query)) {
    // Nếu có từ khóa về sở thích, ưu tiên phân loại là recommendation
    console.log("[ENHANCED_INTENT] Phát hiện ý định thể hiện SỞ THÍCH, phân loại là recommendation");
    
    // Cải tiến: Bổ sung thông tin về danh mục cụ thể vào entities
    const entities = extractEntities(lowerMsg);
    if (specificCategory) {
      entities.specificCategory = specificCategory;
      console.log(`[ENHANCED_INTENT] Đính kèm thông tin danh mục cụ thể: ${specificCategory}`);
    }
    
    return {
      intent: 'recommendation',
      confidence: 0.9, // Tăng độ tin cậy khi có cả sở thích và danh mục
      entities: entities
    };
  }
  
  // Ưu tiên kiểm tra cụm từ về đề xuất món ăn
  if (containsAny(lowerMsg, intentKeywords.food_recommendation)) {
    console.log("[ENHANCED_INTENT] Phát hiện ý định đề xuất MÓN ĂN, phân loại là food_recommendation");
    
    // Thêm thông tin về danh mục cụ thể
    const entities = extractEntities(lowerMsg);
    if (specificCategory) {
      entities.specificCategory = specificCategory;
    }
    
    return {
      intent: 'food_recommendation',
      confidence: 0.88,
      entities: entities
    };
  }
  
  // Kiểm tra các từ đơn về đề xuất/gợi ý
  if (containsAny(lowerMsg, intentKeywords.recommendation)) {
    console.log("[ENHANCED_INTENT] Phát hiện ý định ĐỀ XUẤT/GỢI Ý, phân loại là recommendation");
    
    // Thêm thông tin về danh mục cụ thể
    const entities = extractEntities(lowerMsg);
    if (specificCategory) {
      entities.specificCategory = specificCategory;
    }
    
    return {
      intent: 'recommendation',
      confidence: 0.82,
      entities: entities
    };
  }
  
  // Phát hiện category chỉ khi không phải truy vấn về sở thích
  const flattenedKeywords = [
    ...intentKeywords.preference_query,
    ...intentKeywords.recommendation,
    ...intentKeywords.food_recommendation
  ];
  
  if (!containsAny(lowerMsg, flattenedKeywords)) {
    const detectedCategory = await detectCategory(lowerMsg);
    if (detectedCategory) {
      console.log(`[ENHANCED_INTENT] Phát hiện DANH MỤC: ${detectedCategory}, phân loại là category_search`);
      return {
        intent: 'category_search',
        confidence: 0.7,
        entities: {
          category: detectedCategory,
          ...extractEntities(lowerMsg)
        }
      };
    }
  }
  
  // Kiểm tra ý định tìm kiếm sản phẩm
  if (containsAny(lowerMsg, ['tìm', 'kiếm', 'search', 'lookup', 'món', 'đồ ăn'])) {
    console.log("[ENHANCED_INTENT] Phát hiện ý định TÌM KIẾM, phân loại là product_search");
    return {
      intent: 'product_search',
      confidence: 0.75,
      entities: extractEntities(lowerMsg)
    };
  }
  
  // Mặc định là ý định general
  console.log("[ENHANCED_INTENT] Không phát hiện ý định cụ thể, phân loại là general");
  return {
    intent: 'general',
    confidence: 0.5,
    entities: extractEntities(lowerMsg)
  };
};

/**
 * Áp dụng phiên bản cải tiến này vào chatController
 */
export const analyzeMessage = async (message: string) => {
  return await classifyEnhancedUserIntent(message);
}; 