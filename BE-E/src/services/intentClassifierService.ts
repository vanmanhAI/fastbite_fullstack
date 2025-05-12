import { AppDataSource } from '../config/database';
import { User, UserPreferences } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Category } from '../models/Category';
import { extractKeywords, categorizeKeywords } from '../utils/textProcessing';
import logger from '../config/logger';

// Interface định nghĩa cấu trúc của ý định người dùng
export interface UserIntent {
  type: 'food_recommendation' | 'order_status' | 'menu_query' | 'greeting' | 'complaint' | 'general_query';
  confidence: number;
  keywords: string[];
  context?: any;
}

// Hàm phân tích ý định dựa trên tin nhắn và dữ liệu của người dùng
export const classifyUserIntent = async (userId: number | null, message: string): Promise<UserIntent> => {
  try {
    // Trích xuất từ khóa từ tin nhắn
    const keywords = extractKeywords(message);
    
    // Phân tích ý định dựa trên từ khóa
    const intent = keywordBasedIntentClassification(message, keywords);
    
    // Nếu là yêu cầu gợi ý món ăn, bổ sung thông tin từ người dùng
    if (intent.type === 'food_recommendation' && userId) {
      try {
        // Lấy thông tin ưu tiên của người dùng
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({
          where: { id: userId },
          select: ['preferences']
        });
        
        if (user) {
          // Lấy danh mục món ăn đã đặt nhiều nhất
          const mostOrderedCategories = await getMostOrderedCategories(userId);
          
          intent.context = {
            userPreferences: user.preferences || {},
            previousOrders: mostOrderedCategories
          };
        }
      } catch (userError) {
        logger.error('Lỗi lấy thông tin người dùng:', userError);
      }
    }
    
    return intent;
    
  } catch (error) {
    logger.error('Lỗi trong quá trình phân loại ý định:', error);
    return {
      type: 'general_query',
      confidence: 0.3,
      keywords: extractKeywords(message)
    };
  }
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
    general_query: 0
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
  const intentEntries = Object.entries(matchCount) as [UserIntent['type'], number][];
  const maxIntent = intentEntries.reduce(
    (max, current) => (current[1] > max[1] ? current : max),
    ['general_query', 0] as [UserIntent['type'], number]
  );
  
  // Nếu không có từ khóa nào khớp, coi là general_query
  const intentType = maxIntent[1] > 0 ? maxIntent[0] : 'general_query';
  const confidence = maxIntent[1] > 0 ? Math.min(0.5 + maxIntent[1] * 0.1, 0.9) : 0.4;
  
  return {
    type: intentType,
    confidence,
    keywords
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
    if (intent.type === 'food_recommendation' && intent.keywords.length > 0) {
      // Tìm theo từ khóa
      const keywordConditions = intent.keywords.map(keyword => 
        `(product.name LIKE :keyword${intent.keywords.indexOf(keyword)} 
         OR product.description LIKE :keyword${intent.keywords.indexOf(keyword)}
         OR product.tags LIKE :keyword${intent.keywords.indexOf(keyword)})`
      ).join(' OR ');
      
      const keywordParams: Record<string, string> = {};
      intent.keywords.forEach((keyword, index) => {
        keywordParams[`keyword${index}`] = `%${keyword}%`;
      });
      
      query = query.andWhere(`(${keywordConditions})`, keywordParams);
    }
    
    // Nếu có thông tin người dùng, sử dụng để cá nhân hóa kết quả
    if (intent.context?.userPreferences) {
      const preferences = intent.context.userPreferences as UserPreferences;
      
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
    GENERAL_QUERY: 'general_query'        // Truy vấn chung/không xác định
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