import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { ChatLog } from "../models/ChatLog";
import { processMessageWithRAG, ChatMessage } from "../services/aiService";
import { Product } from "../models/Product";
import { UserPreference } from "../models/UserPreference";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { UserBehaviorService } from "../services/UserBehaviorService";
import { RecommendationEngineService } from "../services/RecommendationEngineService";
import { getRecommendedProducts } from "../services/intentClassifierService";
import { Category } from "../models/Category";
import { classifyEnhancedUserIntent, UserIntent } from '../services/enhancedIntentClassifier';
import { In } from "typeorm";

const chatLogRepository = AppDataSource.getRepository(ChatLog);
const productRepository = AppDataSource.getRepository(Product);
const userPreferenceRepository = AppDataSource.getRepository(UserPreference);
const userBehaviorRepository = AppDataSource.getRepository(UserBehavior);
const categoryRepository = AppDataSource.getRepository(Category);
const userBehaviorService = new UserBehaviorService();
const recommendationEngine = new RecommendationEngineService();

// Xử lý câu hỏi về sở thích của người dùng
async function handleUserPreferenceQuery(userId: number, message: string): Promise<any> {
  try {
    console.log(`[DEBUG] Đang xử lý câu hỏi về sở thích của user ${userId}: "${message}"`);
    
    // Lấy dữ liệu hành vi người dùng
    const userBehaviorRepository = AppDataSource.getRepository(UserBehavior);
    const productRepository = AppDataSource.getRepository(Product);
    
    const userBehaviors = await userBehaviorRepository.find({
      where: { userId },
      relations: ["product"],
      order: { count: "DESC", weight: "DESC" },
      take: 30 // Lấy nhiều dữ liệu hơn để phân tích
    });
    
    // Nếu chưa có dữ liệu hành vi
    if (userBehaviors.length === 0) {
      return {
        response: "Tôi chưa biết bạn thích món gì. Hãy tương tác nhiều hơn với các sản phẩm để tôi có thể gợi ý tốt hơn!",
        metadata: null
      };
    }
    
    // Đếm số lần tương tác theo loại sản phẩm
    const productNames = new Map<number, string>();
    const viewCounts = new Map<number, number>();
    const likeCounts = new Map<number, number>();
    const cartCounts = new Map<number, number>();
    const productScores = new Map<number, number>();
    
    // Lấy thông tin sản phẩm để phân tích
    for (const behavior of userBehaviors) {
      if (behavior.product) {
        productNames.set(behavior.product.id, behavior.product.name);
        
        // Phân loại hành vi
        if (behavior.behaviorType === BehaviorType.VIEW) {
          viewCounts.set(behavior.product.id, (viewCounts.get(behavior.product.id) || 0) + behavior.count);
        } 
        else if (behavior.behaviorType === BehaviorType.LIKE) {
          likeCounts.set(behavior.product.id, (likeCounts.get(behavior.product.id) || 0) + behavior.count);
        }
        else if (behavior.behaviorType === BehaviorType.ADD_TO_CART) {
          cartCounts.set(behavior.product.id, (cartCounts.get(behavior.product.id) || 0) + behavior.count);
        }
      }
    }
    
    // Trọng số cho mỗi loại hành vi
    const weights = {
      view: 1,
      like: 4,   // Tăng từ 3 lên 4
      cart: 7    // Tăng từ 5 lên 7
    };
    
    // Tính điểm tổng hợp cho mỗi sản phẩm
    for (const [productId] of productNames) {
      const viewScore = (viewCounts.get(productId) || 0) * weights.view;
      const likeScore = (likeCounts.get(productId) || 0) * weights.like;
      
      // Tăng hệ số nhân cho hành vi thêm vào giỏ hàng, lũy thừa theo số lần thêm
      const cartCount = cartCounts.get(productId) || 0;
      const cartScore = cartCount > 0 ? Math.pow(cartCount, 1.8) * weights.cart : 0;
      
      const totalScore = viewScore + likeScore + cartScore;
      if (totalScore > 0) {
        productScores.set(productId, totalScore);
      }
    }
    
    // Sắp xếp sản phẩm theo điểm
    const topProducts = [...productScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([productId, score]) => ({
        id: productId,
        name: productNames.get(productId) || "",
        score
      }));
    
    // Kiểm tra sản phẩm yêu thích theo loại (đồ uống, đồ ăn, ...)
    const lowerQuery = message.toLowerCase();
    
    // Kiểm tra câu hỏi có đề cập đến đồ uống không
    if (lowerQuery.includes('nước') || lowerQuery.includes('thức uống') || lowerQuery.includes('đồ uống')) {
      // Lọc sản phẩm thuộc danh mục đồ uống
      const drinkProductIds = new Set<number>();
      const drinkScores = new Map<number, number>();
      
      for (const behavior of userBehaviors) {
        if (behavior.product && 
            (behavior.product.category?.toLowerCase() === 'drink' || 
             behavior.product.category?.toLowerCase() === 'đồ uống' || 
             behavior.product.name.toLowerCase().includes('nước') ||
             (behavior.product.tags && behavior.product.tags.toLowerCase().includes('drink')))) {
          
          drinkProductIds.add(behavior.product.id);
          
          // Tính điểm cho đồ uống với trọng số mới
          const productId = behavior.product.id;
          const viewScore = (viewCounts.get(productId) || 0) * weights.view;
          const likeScore = (likeCounts.get(productId) || 0) * weights.like;
          const cartCount = cartCounts.get(productId) || 0;
          const cartScore = cartCount > 0 ? Math.pow(cartCount, 2.0) * weights.cart : 0;
          
          // Điểm thêm cho hành vi thêm vào giỏ hàng nhiều lần
          const boostScore = cartCount >= 5 ? Math.log(cartCount) * 10 : 0;
          
          const totalScore = viewScore + likeScore + cartScore + boostScore;
          if (totalScore > 0) {
            drinkScores.set(productId, totalScore);
          }
        }
      }
      
      if (drinkScores.size > 0) {
        // Tìm đồ uống yêu thích nhất
        const favoritedrink = [...drinkScores.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id, score]) => ({ 
            id, 
            name: productNames.get(id) || "",
            score 
          }))[0];
        
        const product = await productRepository.findOne({ where: { id: favoritedrink.id } });
        
        if (product) {
          // Nếu có sản phẩm có điểm cao vượt trội (gấp 3 lần sản phẩm thứ 2)
          const sortedScores = [...drinkScores.values()].sort((a, b) => b - a);
          const isDominant = sortedScores.length > 1 && sortedScores[0] > sortedScores[1] * 3;
          
          const cartCount = cartCounts.get(favoritedrink.id) || 0;
          const confidenceText = cartCount >= 8 ? 
                                "Tôi chắc chắn" : 
                                (cartCount >= 5 ? "Tôi khá chắc" : "Tôi nghĩ");
          
          return {
            response: isDominant ?
              `${confidenceText} bạn rất thích ${favoritedrink.name}. Bạn đã thêm vào giỏ hàng ${cartCount} lần và tương tác nhiều với sản phẩm này.` :
              `${confidenceText} bạn thích ${favoritedrink.name}. Đây là đồ uống mà bạn đã tương tác nhiều nhất.`,
            metadata: {
              favorite_product: product,
              interaction_counts: {
                views: viewCounts.get(favoritedrink.id) || 0,
                likes: likeCounts.get(favoritedrink.id) || 0,
                cart_adds: cartCounts.get(favoritedrink.id) || 0
              }
            }
          };
        }
      }
      
      // Nếu không tìm thấy đồ uống yêu thích
      return {
        response: "Tôi chưa thấy bạn tương tác nhiều với các loại đồ uống. Bạn có muốn xem một số đồ uống phổ biến không?",
        metadata: null
      };
    }
    
    // Trả về phản hồi tổng quát về sở thích
    if (topProducts.length > 0) {
      const topProductIds = topProducts.map(p => p.id);
      const products = await productRepository.find({
        where: { id: In(topProductIds) }
      });
      
      const responseProducts = products.map(p => {
        const score = productScores.get(p.id) || 0;
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl || '/images/placeholder-food.jpg',
          description: p.description,
          stock: p.stock,
          confidence: Math.min(0.95, score / 20),
          reasoning: `Bạn đã tương tác nhiều với sản phẩm này`
        };
      });
      
      return {
        response: `Dựa trên hành vi của bạn, tôi thấy bạn quan tâm đến các sản phẩm sau:`,
        metadata: {
          type: 'product_carousel',
          products: responseProducts
        }
      };
    }
    
    return {
      response: "Tôi chưa thể xác định chính xác sở thích của bạn. Hãy tương tác với nhiều sản phẩm hơn để tôi có thể đưa ra gợi ý phù hợp hơn.",
      metadata: null
    };
  } catch (error) {
    console.error("Lỗi khi xử lý câu hỏi về sở thích:", error);
    return {
      response: "Xin lỗi, tôi gặp lỗi khi phân tích sở thích của bạn.",
      metadata: null
    };
  }
}

// Gửi tin nhắn đến chatbot và nhận phản hồi
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default', intentData, chatHistory } = req.body;
    const userId = req.user?.id;
    
    console.log(`[DEBUG] Nhận tin nhắn từ frontend - message: ${message}`);
    console.log(`[DEBUG] userId: ${userId || 'Không có'}`);
    console.log(`[DEBUG] intentData:`, intentData);
    console.log(`[DEBUG] chatHistory:`, chatHistory ? `${chatHistory.length} tin nhắn` : 'Không có');
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tin nhắn'
      });
    }
    
    // Kiểm tra JWT token
    const authHeader = req.headers.authorization;
    console.log(`[DEBUG] Authorization header: ${authHeader ? 'Có' : 'Không có'}`);
    
    // Phân tích ý định nếu chưa có
    let userIntent = intentData;
    if (!userIntent) {
      userIntent = await analyzeUserIntent(message);
    }
    
    console.log(`[DEBUG] Intent phân tích: ${userIntent.intent}, confidence: ${userIntent.confidence}`);
    
    let response = '';
    let metadata = null;
    
    // Xử lý yêu cầu dựa trên ý định
    if (userIntent.intent === 'food_recommendation' || userIntent.intent === 'recommendation') {
      // Kiểm tra nếu là câu hỏi về sở thích của người dùng
      const lowerMsg = message.toLowerCase();
      const isPreferenceQuery = lowerMsg.includes('tôi thích') || 
                              lowerMsg.includes('biết tôi thích') || 
                              (lowerMsg.includes('thích') && lowerMsg.includes('gì'));
      
      console.log(`[DEBUG] Phát hiện câu hỏi sở thích: ${isPreferenceQuery ? 'YES' : 'NO'}`);
      console.log(`[DEBUG] Nội dung tin nhắn: "${lowerMsg}"`);
      
      if (isPreferenceQuery) {
        console.log("[DEBUG] Phát hiện câu hỏi về sở thích người dùng, xử lý đặc biệt");
        const preferenceResponse = await handleUserPreferenceQuery(userId, message);
        response = preferenceResponse.response;
        metadata = preferenceResponse.metadata;
      } else {
        // Xử lý đề xuất sản phẩm dựa trên hành vi người dùng và sở thích
        if (userId) {
          // Sử dụng hàm getPersonalizedChatRecommendations mới cho đề xuất cá nhân hóa
          const result = await userBehaviorService.getPersonalizedChatRecommendations(
            userId, 
            message, // Truyền tin nhắn hiện tại làm query context
            5 // Số lượng sản phẩm cần đề xuất
          );
          
          if (result.success && result.products && result.products.length > 0) {
            // Tạo phản hồi với lý do đề xuất cho từng sản phẩm
            const recommendations = result.products;
            const reasonings = result.reasonings || [];
            
            // Log chi tiết thông tin đề xuất cho việc gỡ lỗi
            console.log(`[PERSONALIZER] Đề xuất cá nhân hóa cho user ${userId}:`);
            console.log(`[PERSONALIZER] Tổng số sản phẩm: ${recommendations.length}`);
            
            // Log từng sản phẩm
            recommendations.forEach((product, idx) => {
              console.log(`[PERSONALIZER] ${idx+1}. ID: ${product.id}, Tên: ${product.name}`);
              if (product.reasoning) {
                console.log(`[PERSONALIZER]    - Lý do: ${product.reasoning}`);
              }
            });
            
            // Kiểm tra nếu là người dùng mới
            if (result.isNewUser) {
              console.log(`[PERSONALIZER] Người dùng ${userId} là người dùng mới`);
              response = `Chào bạn! Vì đây là lần đầu chúng ta trò chuyện, tôi chưa biết nhiều về sở thích của bạn. Hãy thử một trong những món phổ biến dưới đây nhé. Mỗi khi bạn xem hoặc mua một món, tôi sẽ hiểu thêm về khẩu vị của bạn và đưa ra gợi ý phù hợp hơn!`;
            } else {
              // Tạo các lý do dưới dạng danh sách nếu có
              let reasonText = '';
              if (reasonings.length > 0) {
                // Lọc các lý do trùng lặp
                const uniqueReasons = [...new Set(reasonings)];
                if (uniqueReasons.length > 0) {
                  reasonText = `\nTôi đề xuất những món này dựa trên: ${uniqueReasons.join(', ')}.`;
                }
              }
              
              // Thêm ID sản phẩm vào đầu mô tả để dễ theo dõi
              const enhancedProducts = recommendations.map(product => ({
                ...product,
                description: product.description ? 
                  `[ID:${product.id}] ${product.description}` : 
                  `[ID:${product.id}] Món ăn ngon đặc biệt`
              }));
              
              // Tạo thông báo rõ ràng hơn về cách đề xuất hoạt động
              response = `Dựa trên phân tích về các món ăn bạn đã xem và tương tác trước đây, tôi đề xuất những món này:${reasonText}`;
              
              // Cập nhật danh sách sản phẩm với thông tin nâng cao
              recommendations.length = 0;
              enhancedProducts.forEach(p => recommendations.push(p));
            }
            
            metadata = {
              type: 'product_carousel',
              products: recommendations,
              isNewUser: result.isNewUser
            };
          } else {
            // Fallback nếu không có đề xuất cá nhân
            // Kiểm tra nếu đây là lần đầu tiên người dùng tương tác (không có hành vi nào)
            const hasUserBehavior = await userBehaviorRepository.findOne({
              where: { userId }
            });
            
            // Lấy đề xuất sản phẩm phổ biến
            const recommendations = await handleProductRecommendation(userId, userIntent.entities);
            
            if (recommendations && recommendations.products.length > 0) {
              // Thêm thông báo thân thiện khi người dùng chưa có dữ liệu hành vi
              if (!hasUserBehavior) {
                response = `Chào bạn! Vì đây là lần đầu chúng ta trò chuyện, tôi chưa biết nhiều về sở thích của bạn. Hãy thử một trong những món phổ biến dưới đây nhé. Mỗi khi bạn xem hoặc mua một món, tôi sẽ hiểu thêm về khẩu vị của bạn và đưa ra gợi ý phù hợp hơn!`;
              } else {
                response = `Đây là những món phổ biến mà bạn có thể thích:`;
              }
              
              metadata = {
                type: 'product_carousel',
                products: recommendations.products
              };
            } else {
              response = await processMessageWithRAG(message, sessionId);
            }
          }
        } else {
          // Đề xuất cho người dùng chưa đăng nhập
          const recommendations = await handleProductRecommendation(userId, userIntent.entities);
          if (recommendations && recommendations.products.length > 0) {
            response = `Chào bạn! Đây là một số món đang được yêu thích. Để nhận đề xuất phù hợp hơn với khẩu vị cá nhân, hãy đăng nhập để tôi có thể ghi nhớ sở thích của bạn nhé!`;
            metadata = {
              type: 'product_carousel',
              products: recommendations.products
            };
          } else {
            response = await processMessageWithRAG(message, sessionId);
          }
        }
      }
    } else if (userIntent.intent === 'product_search') {
      // Xử lý tìm kiếm sản phẩm
      const searchResults = await handleProductSearch(userIntent.entities.keywords || message);
      
      if (searchResults.products.length > 0) {
        response = `Tôi đã tìm thấy ${searchResults.products.length} sản phẩm phù hợp với yêu cầu của bạn:`;
        metadata = {
          type: 'product_carousel',
          products: searchResults.products
        };
        
        // Lưu hành vi tìm kiếm nếu người dùng đã đăng nhập
        if (userId) {
          await userBehaviorService.trackSearch(userId, userIntent.entities.keywords || message);
        }
      } else {
        response = `Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn.`;
      }
    } else if (userIntent.intent === 'category_search') {
      // Xử lý tìm kiếm theo danh mục
      const categoryName = userIntent.entities.category || '';
      const categoryResults = await handleCategorySearch(userId, categoryName);
      
      if (categoryResults.products.length > 0) {
        response = `Đây là các món thuộc danh mục "${categoryName}":`;
        metadata = {
          type: 'product_carousel',
          products: categoryResults.products
        };
        
        // Lưu hành vi click danh mục nếu người dùng đã đăng nhập
        if (userId) {
          await userBehaviorService.trackCategoryClick(userId, categoryResults.categoryId);
        }
      } else {
        response = `Xin lỗi, tôi không tìm thấy sản phẩm nào thuộc danh mục "${categoryName}".`;
      }
    } else {
      // Xử lý các loại ý định khác
      response = await processMessageWithRAG(message, sessionId);
    }
    
    // Thêm metadata vào phản hồi nếu có
    if (metadata) {
      response = `${response}\n\n[[METADATA]]${JSON.stringify(metadata)}[[/METADATA]]`;
    }
    
    // Lưu tin nhắn vào cơ sở dữ liệu
    const chatLog = chatLogRepository.create({
      userId,
      message,
      response,
      intent: userIntent.intent,
      sessionId
    });
    
    await chatLogRepository.save(chatLog);
    
    return res.status(200).json({
      success: true,
      response,
      intentData: userIntent
    });
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xử lý tin nhắn'
    });
  }
};

// Phân tích ý định người dùng
export const analyzeUserIntent = async (req: Request | string, res?: Response) => {
  try {
    // Xử lý cả khi gọi trực tiếp từ API và từ hàm khác
    const message = typeof req === 'string' ? req : req.body.message;
    const userId = typeof req === 'string' ? null : req.user?.id || null;
    
    if (!message) {
      if (res) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tin nhắn'
        });
      }
      return { intent: 'general', confidence: 0.5, entities: {} };
    }
    
    // Log để debug
    console.log(`[DEBUG] Phân tích ý định cho: "${message}"`);
    
    // Sử dụng bộ phân loại ý định nâng cao
    try {
      const enhancedIntent = await classifyEnhancedUserIntent(message);
      console.log(`[DEBUG] Đã xác định intent là ${enhancedIntent.intent} với confidence ${enhancedIntent.confidence} (phân loại nâng cao)`);
      
      if (res) {
        return res.status(200).json({
          success: true,
          ...enhancedIntent
        });
      }
      
      return enhancedIntent;
    } catch (enhancedError) {
      console.error("Lỗi khi sử dụng bộ phân loại nâng cao, sử dụng phương pháp cũ:", enhancedError);
      
      // Sử dụng phương pháp phân loại cũ nếu có lỗi
      // Phân tích ý định dựa trên từ khóa và cụm từ
      // Ưu tiên kiểm tra cụm từ trước, sau đó mới đến từ đơn
      const lowerMsg = message.toLowerCase();
      const intent: UserIntent = {
        intent: 'general',
        confidence: 0.5,
        entities: {
          keywords: extractKeywords(lowerMsg),
          context: {},
          category: await detectCategory(lowerMsg)
        }
      };
      
      if (
        // Kiểm tra các cụm từ về đề xuất/gợi ý
        containsPhrase(lowerMsg, ['muốn ăn', 'thích ăn', 'gợi ý món', 'đề xuất món',
                                'món ngon', 'nên ăn gì', 'ăn gì ngon', 'món gì ngon',
                                'có món gì', 'món tôi thích', 'món phù hợp']) ||
        // Kiểm tra các từ đơn về đề xuất/gợi ý (sau khi đã không khớp cụm từ)
        containsAny(lowerMsg, ['đề xuất', 'gợi ý', 'recommend', 'món gì', 'có món',
                             'ăn gì', 'món nào', 'ngon không', 'có gì ngon'])
      ) {
        intent.intent = 'recommendation';
        intent.confidence = 0.85;
        console.log(`[DEBUG] Đã xác định intent là recommendation với confidence ${intent.confidence}`);
      } else if (containsAny(lowerMsg, ['tìm', 'kiếm', 'search', 'lookup', 'món', 'đồ ăn'])) {
        intent.intent = 'product_search';
        intent.confidence = 0.75;
        console.log(`[DEBUG] Đã xác định intent là product_search với confidence ${intent.confidence}`);
      } else if (intent.entities.category) {
        intent.intent = 'category_search';
        intent.confidence = 0.7;
        console.log(`[DEBUG] Đã xác định intent là category_search với confidence ${intent.confidence}`);
      } else if (containsAny(lowerMsg, ['đơn hàng', 'trạng thái', 'order', 'status'])) {
        intent.intent = 'order_status';
        intent.confidence = 0.8;
        console.log(`[DEBUG] Đã xác định intent là order_status với confidence ${intent.confidence}`);
      } else {
        console.log(`[DEBUG] Intent không rõ ràng, sử dụng general`);
      }
      
      if (res) {
        return res.status(200).json({
          success: true,
          ...intent
        });
      }
      
      return intent;
    }
  } catch (error) {
    console.error('Lỗi khi phân tích ý định:', error);
    
    if (res) {
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi phân tích ý định'
      });
    }
    
    return { intent: 'general', confidence: 0.5, entities: {} };
  }
};

// Kiểm tra nếu văn bản chứa ít nhất một từ khóa trong danh sách
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

// Kiểm tra nếu văn bản chứa cụm từ hoàn chỉnh trong danh sách
function containsPhrase(text: string, phrases: string[]): boolean {
  return phrases.some(phrase => text.includes(phrase));
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

// Phát hiện danh mục từ tin nhắn
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

// Xử lý đề xuất sản phẩm
async function handleProductRecommendation(userId: number | undefined, intentData: any) {
  try {
    let recommendations = [];
    const limit = 5;

    // Xác định ngữ cảnh thời gian
    const hour = new Date().getHours();
    let mealTime = 'snack';
    
    if (hour >= 6 && hour < 10) {
      mealTime = 'breakfast';
    } else if (hour >= 11 && hour < 14) {
      mealTime = 'lunch';
    } else if (hour >= 17 && hour < 21) {
      mealTime = 'dinner';
    }
    
    // Phân tích ý định và lọc sản phẩm phù hợp
    const queryBuilder = productRepository.createQueryBuilder("product")
      .where("product.isActive = :isActive", { isActive: true })
      .orderBy("product.rating", "DESC")
      .addOrderBy("product.likeCount", "DESC");
    
    // Lọc theo thời gian trong ngày
    if (intentData?.timeOfDay || mealTime) {
      const timeOfDay = intentData?.timeOfDay || mealTime;
      const timeBasedTags = {
        breakfast: ["breakfast", "sáng", "nhẹ", "nhanh"],
        lunch: ["lunch", "trưa", "đầy đủ"],
        dinner: ["dinner", "tối", "đặc biệt"],
        snack: ["snack", "ăn vặt", "nhẹ"]
      };
      
      const tags = timeBasedTags[timeOfDay as keyof typeof timeBasedTags];
      
      if (tags) {
        queryBuilder.andWhere(qb => {
          let condition = "";
          tags.forEach((tag, index) => {
            if (index === 0) {
              condition += `product.tags LIKE :tag${index}`;
            } else {
              condition += ` OR product.tags LIKE :tag${index}`;
            }
            qb.setParameter(`tag${index}`, `%${tag}%`);
          });
          return condition;
        });
      }
    }
    
    // Lọc theo vị giác nếu có
    if (intentData?.taste) {
      queryBuilder.andWhere(`(product.description LIKE :taste OR product.tags LIKE :taste)`, 
        { taste: `%${intentData.taste}%` });
    }
    
    // Lấy sản phẩm phù hợp
    const products = await queryBuilder.take(limit).getMany();
    
    if (products.length > 0) {
      recommendations = products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock
      }));
    } else {
      // Nếu không tìm thấy sản phẩm phù hợp, lấy sản phẩm phổ biến
      const popularProducts = await productRepository.find({
        where: { isActive: true },
        order: { rating: "DESC" },
        take: limit
      });
      
      recommendations = popularProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock
      }));
    }

    return {
      products: recommendations || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Lỗi khi tạo đề xuất sản phẩm:', error);
    return { products: [], timestamp: new Date().toISOString() };
  }
}

// Xử lý tìm kiếm sản phẩm
async function handleProductSearch(query: string) {
  try {
    console.log(`[DEBUG] Tìm kiếm sản phẩm với từ khóa: ${query}`);
    
    // Xử lý từ khóa tìm kiếm
    let keywords: string[];
    
    if (typeof query === 'string' && query.includes(',')) {
      // Nếu query là chuỗi có chứa dấu phẩy, tách nó thành mảng
      keywords = query.split(',').map(k => k.trim()).filter(k => k.length > 0);
      console.log(`[DEBUG] Tách từ khóa tìm kiếm theo dấu phẩy: ${JSON.stringify(keywords)}`);
    } else if (Array.isArray(query)) {
      // Nếu query đã là mảng
      keywords = query;
      console.log(`[DEBUG] Sử dụng mảng từ khóa: ${JSON.stringify(keywords)}`);
    } else {
      // Chuỗi đơn, tách bằng dấu cách
      keywords = query.split(' ').filter(k => k.length > 2);
      console.log(`[DEBUG] Tách từ khóa tìm kiếm theo khoảng trắng: ${JSON.stringify(keywords)}`);
    }
    
    // Nếu không có từ khóa hợp lệ, trả về mảng rỗng
    if (keywords.length === 0) {
      console.log(`[DEBUG] Không có từ khóa tìm kiếm hợp lệ`);
      return { products: [] };
    }
    
    // Tạo query builder
    const queryBuilder = productRepository.createQueryBuilder("product")
      .where("product.isActive = :isActive", { isActive: true });
    
    // Thêm điều kiện tìm kiếm cho mỗi từ khóa (OR)
    queryBuilder.andWhere(qb => {
      const conditions: string[] = [];
      
      keywords.forEach((keyword, index) => {
        conditions.push(`(product.name LIKE :keyword${index} OR product.description LIKE :keyword${index} OR product.tags LIKE :keyword${index})`);
        qb.setParameter(`keyword${index}`, `%${keyword}%`);
      });
      
      return conditions.join(" OR ");
    });
    
    const products = await queryBuilder.take(5).getMany();
    
    console.log(`[DEBUG] Kết quả tìm kiếm: ${products.length} sản phẩm`);
    
    return {
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock
      }))
    };
  } catch (error) {
    console.error('[DEBUG] Lỗi khi tìm kiếm sản phẩm:', error);
    return { products: [] };
  }
}

// Xử lý tìm kiếm theo danh mục
async function handleCategorySearch(userId: number | undefined, categoryName: string) {
  try {
    // Tìm category
    const category = await categoryRepository.findOne({
      where: { name: categoryName }
    });
    
    let categoryId = 0;
    if (category) {
      categoryId = category.id;
    }

    // Tìm sản phẩm thuộc danh mục
    const products = await productRepository.createQueryBuilder("product")
      .innerJoin("product.categories", "category")
      .where("category.name LIKE :categoryName", { categoryName: `%${categoryName}%` })
      .andWhere("product.isActive = :isActive", { isActive: true })
      .take(5)
      .getMany();

    return {
      categoryId,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock
      }))
    };
  } catch (error) {
    console.error('Lỗi khi tìm kiếm theo danh mục:', error);
    return { categoryId: 0, products: [] };
  }
}

// Lấy lịch sử chat của người dùng
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, sessionId } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập'
      });
    }
    
    let query = chatLogRepository.createQueryBuilder('chat')
      .where('chat.userId = :userId', { userId })
      .orderBy('chat.createdAt', 'DESC')
      .take(Number(limit));
      
    // Nếu có sessionId, lọc theo session
    if (sessionId) {
      query = query.andWhere('chat.sessionId = :sessionId', { sessionId });
    }
    
    const history = await query.getMany();

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy lịch sử chat'
    });
  }
};

// Lấy tất cả chat logs (dành cho admin)
export const getAllChatLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await chatLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: Number(limit),
      skip
    });

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy tất cả chat logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy chat logs'
    });
  }
};

/**
 * API trả về đề xuất cá nhân hóa cho chatbot dựa trên dữ liệu hành vi người dùng
 * Route này có thể được sử dụng để kiểm thử hệ thống đề xuất
 */
export const getPersonalizedRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để sử dụng tính năng này"
      });
    }
    
    // Lấy query từ request nếu có
    const query = req.query.query as string || "";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    
    // Sử dụng thuật toán đề xuất nâng cao
    const recommendations = await recommendationEngine.getEnhancedPersonalizedRecommendations(
      userId,
      query,
      limit
    );
    
    if (recommendations.success) {
      return res.status(200).json({
        success: true,
        products: recommendations.products,
        reasonings: recommendations.reasonings,
        query: query || null,
        isNewUser: recommendations.isNewUser || false
      });
    } else {
      return res.status(500).json({
        success: false,
        message: recommendations.error || "Không thể lấy đề xuất sản phẩm"
      });
    }
  } catch (error) {
    console.error("Lỗi khi lấy đề xuất cá nhân hóa:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xử lý yêu cầu"
    });
  }
}; 