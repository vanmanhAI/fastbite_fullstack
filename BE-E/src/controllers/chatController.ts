import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { ChatLog } from "../models/ChatLog";
import { processMessageWithRAG, ChatMessage } from "../services/aiService";
import { Product } from "../models/Product";
import { UserPreference } from "../models/UserPreference";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { UserBehaviorService } from "../services/UserBehaviorService";
import { classifyUserIntent, getRecommendedProducts, UserIntent } from "../services/intentClassifierService";
import { Category } from "../models/Category";

const chatLogRepository = AppDataSource.getRepository(ChatLog);
const productRepository = AppDataSource.getRepository(Product);
const userPreferenceRepository = AppDataSource.getRepository(UserPreference);
const userBehaviorRepository = AppDataSource.getRepository(UserBehavior);
const categoryRepository = AppDataSource.getRepository(Category);
const userBehaviorService = new UserBehaviorService();

// Gửi tin nhắn đến chatbot và nhận phản hồi
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default', intentData } = req.body;
    const userId = req.user?.id;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tin nhắn'
      });
    }
    
    // Phân tích ý định nếu chưa có
    let userIntent = intentData;
    if (!userIntent) {
      userIntent = await analyzeUserIntent(message);
    }
    
    let response = '';
    let metadata = null;
    
    // Xử lý yêu cầu dựa trên ý định
    if (userIntent.intent === 'food_recommendation' || userIntent.intent === 'recommendation') {
      // Xử lý đề xuất sản phẩm dựa trên hành vi người dùng và sở thích
      if (userId) {
        const result = await userBehaviorService.getRecommendationsBySearchHistory(userId, 5);
        
        if (result.success && result.products && result.products.length > 0) {
          const recommendations = result.products;
          response = `Dựa trên sở thích của bạn, tôi đề xuất những món này:`;
          metadata = {
            type: 'product_carousel',
            products: recommendations
          };
        } else {
          // Fallback nếu không có đề xuất cá nhân
          const recommendations = await handleProductRecommendation(userId, userIntent.entities);
          if (recommendations && recommendations.products.length > 0) {
            response = `Đây là những món phổ biến mà bạn có thể thích:`;
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
          response = `Đây là những món phổ biến mà bạn có thể thích:`;
          metadata = {
            type: 'product_carousel',
            products: recommendations.products
          };
        } else {
          response = await processMessageWithRAG(message, sessionId);
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
    
    // Phân tích ý định dựa trên từ khóa
    const lowerMsg = message.toLowerCase();
    const intent = {
      intent: 'general',
      confidence: 0.5,
      entities: {
        keywords: extractKeywords(lowerMsg),
        context: {},
        category: await detectCategory(lowerMsg)
      }
    };
    
    // Xác định ý định dựa trên từ khóa
    if (containsAny(lowerMsg, ['đề xuất', 'gợi ý', 'món ngon', 'nên ăn', 'recommend'])) {
      intent.intent = 'recommendation';
      intent.confidence = 0.8;
    } else if (containsAny(lowerMsg, ['tìm', 'kiếm', 'search', 'lookup', 'món', 'đồ ăn'])) {
      intent.intent = 'product_search';
      intent.confidence = 0.75;
    } else if (intent.entities.category) {
      intent.intent = 'category_search';
      intent.confidence = 0.7;
    } else if (containsAny(lowerMsg, ['đơn hàng', 'trạng thái', 'order', 'status'])) {
      intent.intent = 'order_status';
      intent.confidence = 0.8;
    }
    
    if (res) {
      return res.status(200).json({
        success: true,
        ...intent
      });
    }
    
    return intent;
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

// Trích xuất từ khóa từ văn bản
function extractKeywords(text: string): string[] {
  return text.split(' ')
    .filter(word => word.length > 3)
    .filter(word => !['đang', 'không', 'được', 'những', 'nhưng', 'rằng', 'hoặc'].includes(word));
}

// Phát hiện danh mục từ tin nhắn
async function detectCategory(message: string): Promise<string | null> {
  try {
    const lowerMsg = message.toLowerCase();
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
    const products = await productRepository.createQueryBuilder("product")
      .where("product.isActive = :isActive", { isActive: true })
      .andWhere("(product.name LIKE :query OR product.description LIKE :query OR product.tags LIKE :query)")
      .setParameter("query", `%${query}%`)
      .take(5)
      .getMany();

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
    console.error('Lỗi khi tìm kiếm sản phẩm:', error);
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