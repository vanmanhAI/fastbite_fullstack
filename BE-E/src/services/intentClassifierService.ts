import { AppDataSource } from '../config/database';
import { User, UserPreferences } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Category } from '../models/Category';
import { categorizeKeywords } from '../utils/textProcessing';
import logger from '../config/logger';
import { OrderItem } from '../models/OrderItem';
import { In } from 'typeorm';

// Interface định nghĩa cấu trúc của ý định người dùng
export interface UserIntent {
  intent: 'recommendation' | 'food_recommendation' | 'product_search' | 'order_status' | 'category_search' | 'general';
  confidence: number;
  entities: any;
}

// Hàm kiểm tra nếu văn bản chứa ít nhất một từ khóa trong danh sách
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

// Hàm phát hiện danh mục từ text
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

// Trích xuất từ khóa từ văn bản
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

// Trích xuất thực thể từ văn bản
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

// Cải thiện phương thức phân loại ý định để nhận diện câu hỏi về sở thích
export const classifyUserIntent = async (message: string): Promise<UserIntent> => {
  const lowerMsg = message.toLowerCase();
  
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
    ]
  };
  
  // Kiểm tra các cụm từ ưu tiên về sở thích người dùng
  if (containsAny(lowerMsg, intentKeywords.preference_query)) {
    // Nếu có từ khóa về sở thích, ưu tiên phân loại là recommendation
    return {
      intent: 'recommendation',
      confidence: 0.85,
      entities: extractEntities(lowerMsg)
    };
  }
  
  // Ưu tiên kiểm tra cụm từ về đề xuất món ăn
  if (containsAny(lowerMsg, intentKeywords.food_recommendation)) {
    return {
      intent: 'food_recommendation',
      confidence: 0.88,
      entities: extractEntities(lowerMsg)
    };
  }
  
  // Kiểm tra các từ đơn về đề xuất/gợi ý
  if (containsAny(lowerMsg, intentKeywords.recommendation)) {
    return {
      intent: 'recommendation',
      confidence: 0.82,
      entities: extractEntities(lowerMsg)
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
    return {
      intent: 'product_search',
      confidence: 0.75,
      entities: extractEntities(lowerMsg)
    };
  }
  
  // Mặc định là ý định general
  return {
    intent: 'general',
    confidence: 0.5,
    entities: extractEntities(lowerMsg)
  };
};

// Phân tích dựa trên từ khóa
function keywordBasedIntentClassification(message: string, keywords: string[]): UserIntent {
  const lowerMessage = message.toLowerCase();
  
  // Các từ khóa phổ biến cho từng loại ý định
  const foodRecommendationKeywords = ['gợi ý', 'món gì', 'món nào', 'đề xuất', 'ngon', 'thực đơn', 'đặc sản', 'muốn ăn'];
  const orderStatusKeywords = ['đơn hàng', 'trạng thái', 'theo dõi', 'giao tới đâu', 'khi nào', 'đã giao', 'vận chuyển'];
  const menuQueryKeywords = ['giá', 'giá bao nhiêu', 'thành phần', 'có món', 'khuyến mãi', 'combo', 'menu'];
  const greetingKeywords = ['xin chào', 'hello', 'hi', 'chào bạn', 'chào'];
  const complaintKeywords = ['phàn nàn', 'khiếu nại', 'không hài lòng', 'trễ', 'lạnh', 'tệ', 'không ngon'];
  
  // Kiểm tra từng loại ý định
  let matchCount = {
    food_recommendation: 0,
    order_status: 0,
    menu_query: 0,
    greeting: 0,
    complaint: 0,
    general: 0
  };
  
  // Đếm số từ khóa khớp với mỗi loại ý định
  for (const keyword of keywords) {
    if (foodRecommendationKeywords.some(k => keyword.includes(k) || lowerMessage.includes(k))) {
      matchCount.food_recommendation++;
    }
    if (orderStatusKeywords.some(k => keyword.includes(k) || lowerMessage.includes(k))) {
      matchCount.order_status++;
    }
    if (menuQueryKeywords.some(k => keyword.includes(k) || lowerMessage.includes(k))) {
      matchCount.menu_query++;
    }
    if (greetingKeywords.some(k => keyword.includes(k) || lowerMessage.includes(k))) {
      matchCount.greeting++;
    }
    if (complaintKeywords.some(k => keyword.includes(k) || lowerMessage.includes(k))) {
      matchCount.complaint++;
    }
  }
  
  // Tìm loại ý định có số từ khóa khớp cao nhất
  // Sửa lỗi kiểu dữ liệu không khớp
  type ValidIntent = UserIntent['intent'];
  const intentEntries = Object.entries(matchCount) as [ValidIntent, number][];
  const maxIntent = intentEntries.reduce(
    (max, current) => (current[1] > max[1] ? current : max),
    ['general', 0] as [ValidIntent, number]
  );
  
  // Nếu không có từ khóa nào khớp, coi là general
  const intentType: ValidIntent = maxIntent[1] > 0 ? maxIntent[0] : 'general';
  const confidence = maxIntent[1] > 0 ? Math.min(0.5 + maxIntent[1] * 0.1, 0.9) : 0.4;
  
  return {
    intent: intentType,
    confidence,
    entities: extractEntities(message)
  };
}

// Hàm lấy danh mục món ăn đã đặt nhiều nhất
async function getMostOrderedCategories(userId: number, limit = 3) {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    
    // Lấy các đơn hàng gần đây của người dùng
    const orders = await orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .limit(10)
      .leftJoinAndSelect('order.orderItems', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('product.categories', 'category')
      .getMany();
    
    const categoryCount: Record<string, number> = {};
    
    // Đếm số lần xuất hiện của mỗi danh mục
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.product && item.product.categories) {
          for (const category of item.product.categories) {
            const categoryId = category.id.toString();
            categoryCount[categoryId] = (categoryCount[categoryId] || 0) + item.quantity;
          }
        }
      }
    }
    
    // Sắp xếp và lấy danh mục phổ biến nhất
    const sortedCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
    
    return sortedCategories;
  } catch (error) {
    logger.error('Lỗi khi lấy danh mục món ăn phổ biến:', error);
    return [];
  }
}

// Lấy các sản phẩm phù hợp dựa trên ý định và ngữ cảnh
export async function getRecommendedProducts(intent: UserIntent): Promise<Product[]> {
  try {
    const productRepository = AppDataSource.getRepository(Product);
    let query = productRepository.createQueryBuilder('product')
      .where('product.isActive = :active', { active: true });
    
    // Nếu có từ khóa liên quan đến thực phẩm, tìm sản phẩm phù hợp
    if (intent.intent === 'food_recommendation' && intent.entities.keywords.length > 0) {
      // Tìm theo từ khóa
      const keywordConditions = intent.entities.keywords.map(keyword => 
        `(product.name LIKE :keyword${intent.entities.keywords.indexOf(keyword)} 
         OR product.description LIKE :keyword${intent.entities.keywords.indexOf(keyword)}
         OR product.tags LIKE :keyword${intent.entities.keywords.indexOf(keyword)})`
      ).join(' OR ');
      
      const keywordParams: Record<string, string> = {};
      intent.entities.keywords.forEach((keyword, index) => {
        keywordParams[`keyword${index}`] = `%${keyword}%`;
      });
      
      query = query.andWhere(`(${keywordConditions})`, keywordParams);
    }
    
    // Nếu có thông tin người dùng, sử dụng để cá nhân hóa kết quả
    if (intent.entities.context?.userPreferences) {
      const preferences = intent.entities.context.userPreferences as UserPreferences;
      
      // Ưu tiên theo danh mục yêu thích
      if (preferences.favoriteCategories && preferences.favoriteCategories.length > 0) {
        query = query.leftJoinAndSelect('product.categories', 'category')
          .orderBy('CASE WHEN category.id IN (:...favoriteCategories) THEN 1 ELSE 0 END', 'DESC')
          .setParameter('favoriteCategories', preferences.favoriteCategories);
      }
      
      // Ưu tiên theo khẩu vị
      if (preferences.tastePreferences) {
        const tasteTags: string[] = [];
        if (preferences.tastePreferences.spicy) tasteTags.push('cay');
        if (preferences.tastePreferences.sweet) tasteTags.push('ngọt');
        if (preferences.tastePreferences.sour) tasteTags.push('chua');
        if (preferences.tastePreferences.bitter) tasteTags.push('đắng');
        if (preferences.tastePreferences.savory) tasteTags.push('umami');
        
        if (tasteTags.length > 0) {
          const tasteConditions = tasteTags.map((tag, idx) => 
            `product.tags LIKE :taste${idx}`
          ).join(' OR ');
          
          const tasteParams: Record<string, string> = {};
          tasteTags.forEach((tag, idx) => {
            tasteParams[`taste${idx}`] = `%${tag}%`;
          });
          
          query = query.andWhere(`(${tasteConditions})`, tasteParams);
        }
      }
    }
    
    // Giới hạn kết quả và sắp xếp
    query = query.orderBy('product.rating', 'DESC')
      .addOrderBy('product.numReviews', 'DESC')
      .limit(5);
    
    return await query.getMany();
  } catch (error) {
    logger.error('Lỗi khi lấy sản phẩm đề xuất:', error);
    return [];
  }
}

/**
 * Service phân loại ý định từ các truy vấn tìm kiếm
 */
export class IntentClassifierService {
  // Các loại ý định phổ biến
  private readonly INTENT_TYPES = {
    PRODUCT_SEARCH: 'product_search',     // Tìm kiếm sản phẩm cụ thể
    CATEGORY_BROWSE: 'category_browse',   // Duyệt danh mục
    PRICE_CHECK: 'price_check',           // Kiểm tra giá
    FEATURE_SEARCH: 'feature_search',     // Tìm kiếm theo tính năng/thuộc tính
    RECOMMENDATION: 'recommendation',      // Mong muốn đề xuất
    GENERAL_QUERY: 'general'              // Truy vấn chung/không xác định - đã sửa thành 'general'
  };

  /**
   * Phân loại ý định từ truy vấn tìm kiếm
   * @param query Chuỗi tìm kiếm cần phân loại
   * @returns Thông tin về ý định người dùng
   */
  async classifySearchIntent(query: string): Promise<{ 
    type: string, 
    confidence: number,
    entities: any,
    keywords: string[]
  }> {
    try {
      // Trích xuất từ khóa
      const keywords = extractKeywords(query);
      if (keywords.length === 0) {
        return {
          type: this.INTENT_TYPES.GENERAL_QUERY,
          confidence: 0.5,
          entities: {},
          keywords: []
        };
      }
      
      // Phân loại từ khóa theo ngữ cảnh
      const categorized = categorizeKeywords(keywords);
      
      // Phân tích patterns và từ khóa đặc biệt
      const lowerQuery = query.toLowerCase();
      const patterns = this.analyzePatterns(lowerQuery);
      
      // Xác định ý định dựa trên thông tin phân tích
      let intentType = this.INTENT_TYPES.GENERAL_QUERY;
      let confidence = 0.5;
      const entities: any = {};
      
      // Ưu tiên xác định ý định theo patterns
      if (patterns.isPriceQuery) {
        intentType = this.INTENT_TYPES.PRICE_CHECK;
        confidence = 0.8;
        if (patterns.priceRange) {
          entities.priceRange = patterns.priceRange;
        }
      } 
      else if (patterns.isRecommendation) {
        intentType = this.INTENT_TYPES.RECOMMENDATION;
        confidence = 0.85;
      }
      // Xác định theo danh mục từ khóa
      else if (categorized.products.length > 0) {
        intentType = this.INTENT_TYPES.PRODUCT_SEARCH;
        confidence = 0.7 + Math.min(0.2, categorized.products.length * 0.05);
        entities.products = categorized.products;
      }
      else if (categorized.categories.length > 0) {
        intentType = this.INTENT_TYPES.CATEGORY_BROWSE;
        confidence = 0.7 + Math.min(0.2, categorized.categories.length * 0.05);
        entities.categories = categorized.categories;
      }
      else if (categorized.features.length > 0) {
        intentType = this.INTENT_TYPES.FEATURE_SEARCH;
        confidence = 0.65 + Math.min(0.2, categorized.features.length * 0.05);
        entities.features = categorized.features;
      }
      
      // Gộp tất cả entities lại
      entities.categorized = categorized;
      
      return {
        type: intentType,
        confidence,
        entities,
        keywords
      };
    } catch (error) {
      console.error("Lỗi khi phân loại ý định tìm kiếm:", error);
      return {
        type: this.INTENT_TYPES.GENERAL_QUERY,
        confidence: 0.3,
        entities: {},
        keywords: []
      };
    }
  }
  
  /**
   * Phân tích patterns trong truy vấn tìm kiếm
   * @param query Truy vấn tìm kiếm (đã lowercase)
   * @returns Các patterns nhận diện được
   */
  private analyzePatterns(query: string): { 
    isPriceQuery: boolean, 
    isRecommendation: boolean,
    priceRange?: { min?: number, max?: number }
  } {
    const result = {
      isPriceQuery: false,
      isRecommendation: false,
      priceRange: undefined as { min?: number, max?: number } | undefined
    };
    
    // Kiểm tra các patterns liên quan đến giá
    const pricePatterns = [
      'giá', 'price', 'bao nhiêu', 'đắt', 'rẻ', 'mắc', 'tiền', 'cost', 'khoảng giá'
    ];
    result.isPriceQuery = pricePatterns.some(pattern => query.includes(pattern));
    
    // Trích xuất khoảng giá nếu có
    const priceRangePattern = /(\d+)[kK]?\s*-\s*(\d+)[kK]?/;
    const priceRangeMatch = query.match(priceRangePattern);
    if (priceRangeMatch) {
      const min = parseInt(priceRangeMatch[1]);
      const max = parseInt(priceRangeMatch[2]);
      result.priceRange = { min, max };
    }
    
    // Kiểm tra patterns liên quan đến sự đề xuất
    const recommendationPatterns = [
      'đề xuất', 'recommend', 'gợi ý', 'suggest', 'nên', 'should', 'tốt nhất', 'best',
      'phổ biến', 'popular', 'hot', 'xu hướng', 'trend', 'thịnh hành', 'bán chạy'
    ];
    result.isRecommendation = recommendationPatterns.some(pattern => query.includes(pattern));
    
    return result;
  }
} 