import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { UserPreference, PreferenceType } from "../models/UserPreference";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { processMessageWithRAG } from "../services/aiService";
import { UserBehaviorService } from "../services/UserBehaviorService";
import { IntentClassifierService } from "../services/intentClassifierService";

const userPreferenceRepository = AppDataSource.getRepository(UserPreference);
const userBehaviorRepository = AppDataSource.getRepository(UserBehavior);
const productRepository = AppDataSource.getRepository(Product);
const categoryRepository = AppDataSource.getRepository(Category);

const behaviorService = new UserBehaviorService();
const intentClassifierService = new IntentClassifierService();

/**
 * Hàm hỗ trợ lấy userId từ req, ưu tiên lấy từ token auth
 */
const getUserId = (req: Request): number | null => {
  // Ưu tiên lấy từ token xác thực
  if (req.user && req.user.id) {
    return req.user.id;
  }
  
  // Không nên sử dụng userId từ body vì lý do bảo mật
  // Nếu không có user trong token, trả về null
  return null;
};

/**
 * Lấy đề xuất sản phẩm cá nhân hóa
 */
export const getPersonalizedRecommendations = async (req: Request, res: Response) => {
  try {
    const { query, contextType, limit = 5, includeReasoning = false } = req.query;
    const userId = getUserId(req);
    
    // Xác định ngữ cảnh thời gian nếu là meal_time
    let contextValue = '';
    if (contextType === 'meal_time') {
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour < 10) {
        contextValue = 'breakfast';
      } else if (currentHour >= 11 && currentHour < 14) {
        contextValue = 'lunch';
      } else if (currentHour >= 17 && currentHour < 21) {
        contextValue = 'dinner';
      } else {
        contextValue = 'snack';
      }
    }
    
    // Lấy tùy chọn người dùng nếu đã đăng nhập
    let userPreferences = [];
    let userBehaviors = [];
    
    if (userId) {
      userPreferences = await userPreferenceRepository.find({
        where: { userId }
      });
      
      // Lấy hành vi người dùng gần đây
      userBehaviors = await userBehaviorRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 20
      });
    }
    
    // Lấy danh sách sản phẩm
    const products = await productRepository.find({
      where: { isActive: true },
      relations: ["categories"]
    });
    
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm nào trong hệ thống"
      });
    }
    
    // Sử dụng AI để đề xuất sản phẩm nếu có query hoặc đã đăng nhập
    if (query || userId) {
      // Chuẩn bị dữ liệu cho AI
      const userBehaviorSummary = userId 
        ? {
            viewedProducts: userBehaviors
              .filter(b => b.behaviorType === BehaviorType.VIEW)
              .map(b => b.productId),
            purchasedProducts: userBehaviors
              .filter(b => b.behaviorType === BehaviorType.PURCHASE)
              .map(b => b.productId),
            searchQueries: userBehaviors
              .filter(b => b.behaviorType === BehaviorType.SEARCH && b.data)
              .map(b => b.data),
            ratings: userBehaviors
              .filter(b => b.behaviorType === BehaviorType.REVIEW && b.productId && b.weight)
              .map(b => ({ productId: b.productId, rating: b.weight }))
          }
        : null;
      
      // Tổ chức dữ liệu preferences thành định dạng phù hợp để sử dụng
      const userPreferenceSummary = userId 
        ? {
            categoryPreferences: userPreferences
              .filter(p => p.preferenceType === PreferenceType.FAVORITE_CATEGORY)
              .map(p => ({ id: p.categoryId, value: p.value })),
            dietaryRestrictions: userPreferences
              .filter(p => p.preferenceType === PreferenceType.DIETARY)
              .map(p => p.value),
            spiceLevel: userPreferences
              .find(p => p.preferenceType === PreferenceType.SPICY_LEVEL)?.value || "medium",
            tastePreferences: userPreferences
              .filter(p => p.preferenceType === PreferenceType.OTHER && p.value.startsWith('taste:'))
              .map(p => p.value.replace('taste:', '')),
            allergens: userPreferences
              .filter(p => p.preferenceType === PreferenceType.ALLERGEN)
              .map(p => p.value),
            priceRange: {
              min: Number(userPreferences.find(p => p.preferenceType === PreferenceType.PRICE_RANGE && p.value.startsWith('min:'))?.value.replace('min:', '') || 0),
              max: Number(userPreferences.find(p => p.preferenceType === PreferenceType.PRICE_RANGE && p.value.startsWith('max:'))?.value.replace('max:', '') || 1000)
            }
          }
        : null;
      
      const recommendations = await generateRecommendations(
        products,
        query as string || "",
        userPreferenceSummary,
        userBehaviorSummary,
        contextType as string,
        contextValue,
        Number(limit),
        includeReasoning === "true"
      );
      
      // Nếu có đề xuất, trả về kết quả
      if (recommendations && recommendations.length > 0) {
        return res.status(200).json({
          products: recommendations,
          timestamp: new Date().toISOString(),
          baseFactors: [
            query ? "Từ khóa tìm kiếm" : null,
            userId ? "Sở thích cá nhân" : null,
            contextType ? `Ngữ cảnh (${contextType})` : null,
          ].filter(Boolean)
        });
      }
    }
    
    // Fallback: Trả về sản phẩm ngẫu nhiên nếu không có đề xuất
    const randomProducts = products
      .sort(() => 0.5 - Math.random())
      .slice(0, Number(limit))
      .map(product => ({
        ...product,
        confidence: 0.5,
        reasoning: "Đề xuất ngẫu nhiên"
      }));
    
    return res.status(200).json({
      products: randomProducts,
      timestamp: new Date().toISOString(),
      baseFactors: ["Ngẫu nhiên"]
    });
  } catch (error) {
    console.error("Lỗi khi lấy đề xuất sản phẩm:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy đề xuất sản phẩm",
      error: error instanceof Error ? error.message : "Lỗi không xác định"
    });
  }
};

/**
 * Cập nhật hành vi người dùng (xem sản phẩm)
 */
export const trackProductView = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Cần đăng nhập để thực hiện hành động này" 
      });
    }
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin productId" 
      });
    }
    
    // Kiểm tra sản phẩm có tồn tại không
    const product = await productRepository.findOne({
      where: { id: productId }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại"
      });
    }
    
    // Sử dụng transaction để đảm bảo tính nhất quán
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Tìm kiếm view hiện có
      const existingView = await userBehaviorRepository.findOne({
        where: {
          userId,
          productId,
          behaviorType: BehaviorType.VIEW
        }
      });
      
      let result;
      if (existingView) {
        // Nếu đã có view, cập nhật bản ghi hiện có
        console.log(`Người dùng ${userId} đã xem sản phẩm ${productId} trước đó, cập nhật count`);
        existingView.count += 1;
        await userBehaviorRepository.save(existingView);
        result = { success: true, behavior: existingView };
      } else {
        // Nếu chưa có, tạo bản ghi mới
        console.log(`Người dùng ${userId} đang xem sản phẩm ${productId} lần đầu`);
        result = await behaviorService.trackProductView(userId, productId);
      }
      
      await queryRunner.commitTransaction();
      console.log(`[UserBehavior] Đã lưu hành vi xem sản phẩm: User ${userId}, Product ${productId}, Kết quả:`, result);
      
      return res.status(200).json(result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error("Lỗi khi theo dõi hành vi xem sản phẩm:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * Lưu các tìm kiếm của người dùng
 */
export const trackSearchQuery = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { searchQuery } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Cần đăng nhập để thực hiện hành động này" 
      });
    }
    
    if (!searchQuery) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin searchQuery" 
      });
    }
    
    // Phân tích ý định tìm kiếm (nếu có)
    let searchIntent = null;
    try {
      searchIntent = await intentClassifierService.classifySearchIntent(searchQuery);
    } catch (err) {
      console.log("Không thể phân tích ý định tìm kiếm:", err);
    }
    
    // Gọi service để lưu hành vi tìm kiếm nâng cao
    const result = await behaviorService.trackSearch(userId, searchQuery);
    
    // Nếu có thông tin ý định, bổ sung vào kết quả
    if (searchIntent && result.success && result.behavior) {
      try {
        const data = JSON.parse(result.behavior.data);
        data.intent = searchIntent;
        result.behavior.data = JSON.stringify(data);
        
        // Tạo mới một UserBehavior từ data này và lưu
        await userBehaviorRepository.save(result.behavior);
      } catch (e) {
        console.error("Lỗi khi bổ sung ý định tìm kiếm:", e);
      }
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi theo dõi hành vi tìm kiếm:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * Lấy tùy chọn người dùng
 */
export const getUserPreferences = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Cần đăng nhập để lấy tùy chọn cá nhân"
      });
    }
    
    // Lấy tất cả tùy chọn của người dùng
    const preferences = await userPreferenceRepository.find({
      where: { userId }
    });
    
    return res.status(200).json({
      success: true,
      userPreference: {
        categoryPreferences: preferences
          .filter(p => p.preferenceType === PreferenceType.FAVORITE_CATEGORY)
          .map(p => ({ id: p.categoryId, value: p.value })),
        dietaryRestrictions: preferences
          .filter(p => p.preferenceType === PreferenceType.DIETARY)
          .map(p => p.value),
        spiceLevel: preferences
          .find(p => p.preferenceType === PreferenceType.SPICY_LEVEL)?.value || "medium",
        tastePreferences: preferences
          .filter(p => p.preferenceType === PreferenceType.OTHER && p.value.startsWith('taste:'))
          .map(p => p.value.replace('taste:', '')),
        allergens: preferences
          .filter(p => p.preferenceType === PreferenceType.ALLERGEN)
          .map(p => p.value),
        priceRange: {
          min: Number(preferences.find(p => p.preferenceType === PreferenceType.PRICE_RANGE && p.value.startsWith('min:'))?.value.replace('min:', '') || 0),
          max: Number(preferences.find(p => p.preferenceType === PreferenceType.PRICE_RANGE && p.value.startsWith('max:'))?.value.replace('max:', '') || 1000)
        }
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy tùy chọn người dùng:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy tùy chọn người dùng",
      error: error instanceof Error ? error.message : "Lỗi không xác định"
    });
  }
};

/**
 * Cập nhật tùy chọn người dùng
 */
export const updateUserPreferences = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { 
      categoryPreferences, 
      dietaryRestrictions, 
      spiceLevel, 
      tastePreferences, 
      allergens, 
      priceRange 
    } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Cần đăng nhập để cập nhật tùy chọn cá nhân"
      });
    }
    
    // Xóa tất cả tùy chọn hiện tại của người dùng
    await userPreferenceRepository.delete({ userId });
    
    // Mảng để lưu trữ các tùy chọn mới
    const newPreferences = [];
    
    // Thêm tùy chọn danh mục yêu thích
    if (categoryPreferences && Array.isArray(categoryPreferences)) {
      for (const category of categoryPreferences) {
        if (typeof category === 'object' && category.id) {
          newPreferences.push(userPreferenceRepository.create({
            userId,
            preferenceType: PreferenceType.FAVORITE_CATEGORY,
            categoryId: category.id,
            value: category.value || 'liked',
            weight: 1.0
          }));
        }
      }
    }
    
    // Thêm các hạn chế ăn uống
    if (dietaryRestrictions && Array.isArray(dietaryRestrictions)) {
      for (const restriction of dietaryRestrictions) {
        newPreferences.push(userPreferenceRepository.create({
          userId,
          preferenceType: PreferenceType.DIETARY,
          value: restriction,
          weight: 1.0
        }));
      }
    }
    
    // Thêm mức độ cay
    if (spiceLevel) {
      newPreferences.push(userPreferenceRepository.create({
        userId,
        preferenceType: PreferenceType.SPICY_LEVEL,
        value: spiceLevel,
        weight: 1.0
      }));
    }
    
    // Thêm sở thích vị
    if (tastePreferences && Array.isArray(tastePreferences)) {
      for (const taste of tastePreferences) {
        newPreferences.push(userPreferenceRepository.create({
          userId,
          preferenceType: PreferenceType.OTHER,
          value: `taste:${taste}`,
          weight: 1.0
        }));
      }
    }
    
    // Thêm các dị ứng
    if (allergens && Array.isArray(allergens)) {
      for (const allergen of allergens) {
        newPreferences.push(userPreferenceRepository.create({
          userId,
          preferenceType: PreferenceType.ALLERGEN,
          value: allergen,
          weight: 1.0
        }));
      }
    }
    
    // Thêm khoảng giá
    if (priceRange) {
      if (priceRange.min !== undefined) {
        newPreferences.push(userPreferenceRepository.create({
          userId,
          preferenceType: PreferenceType.PRICE_RANGE,
          value: `min:${priceRange.min}`,
          weight: 1.0
        }));
      }
      
      if (priceRange.max !== undefined) {
        newPreferences.push(userPreferenceRepository.create({
          userId,
          preferenceType: PreferenceType.PRICE_RANGE,
          value: `max:${priceRange.max}`,
          weight: 1.0
        }));
      }
    }
    
    // Lưu tất cả tùy chọn mới
    if (newPreferences.length > 0) {
      await userPreferenceRepository.save(newPreferences);
    }
    
    // Lấy lại các tùy chọn đã lưu để trả về
    const updatedPreferences = await userPreferenceRepository.find({
      where: { userId }
    });
    
    // Trả về định dạng dễ sử dụng
    return res.status(200).json({
      success: true,
      message: "Đã cập nhật tùy chọn người dùng",
      userPreference: {
        categoryPreferences: updatedPreferences
          .filter(p => p.preferenceType === PreferenceType.FAVORITE_CATEGORY)
          .map(p => ({ id: p.categoryId, value: p.value })),
        dietaryRestrictions: updatedPreferences
          .filter(p => p.preferenceType === PreferenceType.DIETARY)
          .map(p => p.value),
        spiceLevel: updatedPreferences
          .find(p => p.preferenceType === PreferenceType.SPICY_LEVEL)?.value || "medium",
        tastePreferences: updatedPreferences
          .filter(p => p.preferenceType === PreferenceType.OTHER && p.value.startsWith('taste:'))
          .map(p => p.value.replace('taste:', '')),
        allergens: updatedPreferences
          .filter(p => p.preferenceType === PreferenceType.ALLERGEN)
          .map(p => p.value),
        priceRange: {
          min: Number(updatedPreferences.find(p => p.preferenceType === PreferenceType.PRICE_RANGE && p.value.startsWith('min:'))?.value.replace('min:', '') || 0),
          max: Number(updatedPreferences.find(p => p.preferenceType === PreferenceType.PRICE_RANGE && p.value.startsWith('max:'))?.value.replace('max:', '') || 1000)
        }
      }
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật tùy chọn người dùng:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật tùy chọn người dùng",
      error: error instanceof Error ? error.message : "Lỗi không xác định"
    });
  }
};

/**
 * Hàm helper để sử dụng AI đề xuất sản phẩm
 */
const generateRecommendations = async (
  products: any[],
  query: string,
  userPreference: any,
  userBehavior: any,
  contextType: string,
  contextValue: string,
  limit: number,
  includeReasoning: boolean
) => {
  try {
    // Chuẩn bị prompt cho AI
    const systemPrompt = `
      Bạn là một trợ lý giúp đề xuất món ăn dựa trên:
      1. Từ khóa tìm kiếm của người dùng
      2. Sở thích cá nhân (nếu có)
      3. Hành vi mua hàng và duyệt web trong quá khứ
      4. Ngữ cảnh thời gian (bữa sáng/trưa/tối)
      
      Với mỗi món ăn đề xuất, hãy cung cấp:
      1. Một đánh giá độ phù hợp (từ 0 đến 1)
      2. ${includeReasoning ? 'Một giải thích ngắn gọn vì sao đề xuất món này' : 'Không cần giải thích'}
      
      Chỉ đề xuất món ăn có trong danh sách sản phẩm đã cho.
    `;
    
    const userPreferenceText = userPreference 
      ? `
        Sở thích món ăn: ${userPreference.categoryPreferences?.map(c => c.value).join(', ') || 'không có'}
        Hạn chế ăn uống: ${userPreference.dietaryRestrictions?.join(', ') || 'không có'}
        Mức độ cay: ${userPreference.spiceLevel || 'trung bình'}
        Sở thích vị: ${userPreference.tastePreferences?.join(', ') || 'không có'}
        Dị ứng: ${userPreference.allergens?.join(', ') || 'không có'}
        Khoảng giá: ${userPreference.priceRange?.min || 0}k - ${userPreference.priceRange?.max || 1000}k
      `
      : 'Không có thông tin sở thích cá nhân.';
    
    const userBehaviorText = userBehavior
      ? `
        Sản phẩm đã xem: ${userBehavior.viewedProducts?.join(', ') || 'không có'}
        Sản phẩm đã mua: ${userBehavior.purchasedProducts?.join(', ') || 'không có'}
        Tìm kiếm gần đây: ${userBehavior.searchQueries?.join(', ') || 'không có'}
        Đánh giá: ${userBehavior.ratings?.map(r => `ID: ${r.productId}, Đánh giá: ${r.rating}`).join('; ') || 'không có'}
      `
      : 'Không có thông tin hành vi người dùng.';
    
    // Tạo prompt đầy đủ cho AI
    const fullPrompt = `
      # Thông tin sở thích người dùng
      ${userPreferenceText}
      
      # Hành vi người dùng
      ${userBehaviorText}
      
      # Truy vấn người dùng
      "${query || 'Không có từ khóa tìm kiếm cụ thể'}"
      
      # Ngữ cảnh
      - Loại ngữ cảnh: ${contextType || 'không có'}
      - Giá trị ngữ cảnh: ${contextValue || 'không có'}
      - Thời gian hiện tại: ${new Date().toLocaleTimeString()}
      
      # Danh sách sản phẩm (tối đa ${products.length} sản phẩm)
      ${JSON.stringify(products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.categories?.map(c => c.name).join(', ') || p.category,
        isVegetarian: p.isVegetarian,
        tags: p.tags,
        stock: p.stock
      })))}
      
      Hãy đề xuất tối đa ${limit} món ăn phù hợp nhất dựa trên thông tin trên, trả về một mảng JSON với cấu trúc:
      [
        {
          "id": 1,
          "confidence": 0.95,
          ${includeReasoning ? '"reasoning": "Giải thích lý do đề xuất"' : ''}
        },
        ...
      ]
    `;
    
    // Sử dụng processMessageWithRAG từ aiService
    const aiResponse = await processMessageWithRAG(fullPrompt);
    
    // Tìm JSON trong phản hồi
    const jsonMatch = aiResponse.match(/\[\s*\{.*\}\s*\]/s);
    const jsonStr = jsonMatch ? jsonMatch[0] : null;
    
    if (!jsonStr) {
      // Nếu không tìm thấy JSON, tạo đề xuất ngẫu nhiên thay thế
      return generateMockRecommendations(products, limit, includeReasoning);
    }
    
    try {
      const recommendations = JSON.parse(jsonStr);
      
      if (!Array.isArray(recommendations)) {
        throw new Error("Kết quả AI không đúng định dạng");
      }
      
      // Map ID sản phẩm về thông tin đầy đủ
      return recommendations.map(rec => {
        const product = products.find(p => p.id === rec.id);
        if (!product) return null;
        
        return {
          ...product,
          confidence: rec.confidence || 0.5,
          reasoning: includeReasoning ? (rec.reasoning || "") : undefined
        };
      }).filter(Boolean);
    } catch (error) {
      console.error("Lỗi khi xử lý kết quả từ AI:", error);
      return generateMockRecommendations(products, limit, includeReasoning);
    }
  } catch (error) {
    console.error("Lỗi khi tạo đề xuất:", error);
    return generateMockRecommendations(products, limit, includeReasoning);
  }
};

// Hàm tạo đề xuất giả để sử dụng khi AI gặp lỗi
function generateMockRecommendations(products: any[], limit: number, includeReasoning: boolean) {
  // Tạo đề xuất ngẫu nhiên
  const shuffledProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, limit);
  
  return shuffledProducts.map(product => ({
    ...product,
    confidence: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
    reasoning: includeReasoning ? "Đề xuất dựa trên sở thích của bạn" : undefined
  }));
}

/**
 * Cập nhật hành vi người dùng (thích sản phẩm)
 */
export const trackProductLike = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { productId, isLiked = true } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Cần đăng nhập để thực hiện hành động này"
      });
    }
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin productId" 
      });
    }
    
    // Kiểm tra sản phẩm có tồn tại không
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({
      where: { id: productId }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại"
      });
    }
    
    // Gọi service để lưu hành vi với tham số isLiked
    const result = await behaviorService.trackProductLike(userId, productId, isLiked);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi theo dõi hành vi thích sản phẩm:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * Cập nhật hành vi người dùng (thêm vào giỏ hàng)
 */
export const trackAddToCart = async (req: Request, res: Response) => {
  try {
    console.log("==== TRACK ADD TO CART ====");
    console.log("Request Headers:", {
      authorization: req.headers.authorization ? "Có" : "Không có",
      userId: req.user?.id || 'không có'
    });
    console.log("Request Body:", req.body);
    
    const { productId } = req.body;
    const userId = getUserId(req);
    
    if (!userId) {
      console.log("Lỗi: Người dùng chưa đăng nhập");
      return res.status(401).json({
        success: false,
        message: "Cần đăng nhập để thực hiện hành động này"
      });
    }
    
    if (!productId) {
      console.log("Lỗi: Thiếu thông tin sản phẩm");
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin sản phẩm"
      });
    }
    
    // Kiểm tra sản phẩm có tồn tại không
    const product = await productRepository.findOne({
      where: { id: productId }
    });
    
    if (!product) {
      console.log(`Lỗi: Không tìm thấy sản phẩm ID ${productId}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }
    
    // Sử dụng instance đã tạo sẵn của UserBehaviorService
    const result = await behaviorService.trackAddToCart(userId, productId);
    
    // Ghi log để debug
    console.log(`[UserBehavior] Đã lưu hành vi thêm vào giỏ: User ${userId}, Product ${productId}, Kết quả:`, result);
    
    return res.status(200).json({
      success: true,
      message: "Đã lưu thêm vào giỏ hàng",
      data: { userId, productId, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error("Lỗi khi lưu thêm vào giỏ hàng:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lưu thêm vào giỏ hàng",
      error: error instanceof Error ? error.message : "Lỗi không xác định"
    });
  }
};

/**
 * Cập nhật hành vi người dùng (đánh giá sản phẩm)
 */
export const trackReview = async (req: Request, res: Response) => {
  try {
    console.log("==== TRACK REVIEW ====");
    console.log("Request Headers:", {
      authorization: req.headers.authorization ? "Có" : "Không có",
      userId: req.user?.id || 'không có'
    });
    console.log("Request Body:", req.body);
    
    const { productId, rating, reviewContent } = req.body;
    const userId = getUserId(req);
    
    console.log(`ProductID: ${productId}, Rating: ${rating}, UserID: ${userId}, Review: ${reviewContent || 'không có'}`);
    
    if (!productId || rating === undefined) {
      console.log("Lỗi: Thiếu thông tin sản phẩm hoặc đánh giá");
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin sản phẩm hoặc đánh giá"
      });
    }
    
    // Kiểm tra sản phẩm có tồn tại không
    const product = await productRepository.findOne({
      where: { id: productId }
    });
    
    if (!product) {
      console.log(`Lỗi: Không tìm thấy sản phẩm ID ${productId}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }
    
    // Yêu cầu đăng nhập để thực hiện đánh giá
    if (!userId) {
      console.log("Lỗi: Bạn cần đăng nhập để đánh giá sản phẩm");
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để đánh giá sản phẩm"
      });
    }
    
    // Luôn tạo bản ghi mới cho mỗi đánh giá, với nội dung đánh giá kèm theo
    const reviewData = {
      rating,
      content: reviewContent || '',
      timestamp: new Date().toISOString()
    };
    
    // Tạo bản ghi mới thay vì dùng transaction
    const result = await behaviorService.trackReview(userId, productId, rating, JSON.stringify(reviewData));
    
    // Ghi log để debug
    console.log(`[UserBehavior] Đã lưu hành vi đánh giá sản phẩm: User ${userId}, Product ${productId}, Rating ${rating}, Kết quả:`, result);
    
    return res.status(200).json({
      success: true,
      message: "Đã lưu đánh giá sản phẩm",
      data: { userId, productId, rating, reviewContent, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error("Lỗi khi lưu đánh giá sản phẩm:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lưu đánh giá sản phẩm",
      error: error instanceof Error ? error.message : "Lỗi không xác định"
    });
  }
};

/**
 * Cập nhật hành vi người dùng (click vào danh mục)
 */
export const trackCategoryClick = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { categoryId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Cần đăng nhập để thực hiện hành động này"
      });
    }
    
    if (!categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin categoryId" 
      });
    }
    
    // Kiểm tra xem categoryId có tồn tại không
    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOne({
      where: { id: categoryId }
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Danh mục không tồn tại"
      });
    }
    
    // Lưu hành vi
    const result = await behaviorService.trackCategoryClick(userId, categoryId);
    console.log(`[UserBehavior] Đã lưu hành vi nhấp vào danh mục: User ${userId}, Category ${categoryId}, Kết quả:`, result);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi theo dõi hành vi nhấp vào danh mục:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy sản phẩm đề xuất dựa trên hành vi người dùng
export const getRecommendedProducts = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "userId không hợp lệ" 
      });
    }
    
    // Trả về lỗi tạm thời vì phương thức chưa được triển khai
    return res.status(501).json({ 
      success: false, 
      message: "Chức năng đang được phát triển" 
    });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm đề xuất:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy đề xuất dựa trên lịch sử tìm kiếm
export const getRecommendationsBySearch = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "userId không hợp lệ" 
      });
    }
    
    // Đảm bảo rằng behaviorService có phương thức này
    if (typeof behaviorService.getRecommendationsBySearchHistory === 'function') {
      const result = await behaviorService.getRecommendationsBySearchHistory(userId, limit);
      return res.status(200).json(result);
    }
    
    // Nếu không, trả về lỗi
    return res.status(501).json({ 
      success: false, 
      message: "Chức năng đang được phát triển" 
    });
  } catch (error) {
    console.error("Lỗi khi lấy đề xuất từ lịch sử tìm kiếm:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy phân tích hành vi tìm kiếm
export const getSearchAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "userId không hợp lệ" 
      });
    }
    
    // Gọi service để lấy phân tích hành vi tìm kiếm
    const result = await behaviorService.getSearchAnalytics(userId, limit);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi lấy phân tích tìm kiếm:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy dữ liệu cá nhân hóa cho chatbot
export const getChatPersonalization = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "userId không hợp lệ" 
      });
    }
    
    // Tạm thời trả về thông báo chức năng đang phát triển
    return res.status(501).json({
      success: false,
      message: "Chức năng đang được phát triển"
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu cá nhân hóa cho chatbot:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * Liên kết hành vi xem sản phẩm từ kết quả tìm kiếm
 */
export const trackProductViewFromSearch = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { productId, searchQuery } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Cần đăng nhập để thực hiện hành động này"
      });
    }
    
    if (!productId || !searchQuery) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin productId hoặc searchQuery"
      });
    }
    
    // Gọi service để lưu hành vi
    try {
      // Nếu service có phương thức sẵn, sử dụng phương thức đó
      if (typeof behaviorService.trackProductViewFromSearch === 'function') {
        const result = await behaviorService.trackProductViewFromSearch(userId, productId, searchQuery);
        return res.status(200).json(result);
      }
      
      // Nếu không, lưu hành vi xem sản phẩm thông thường
      const viewResult = await behaviorService.trackProductView(userId, productId);
      
      // Ghi log để phân tích sau
      console.log(`[SearchTrack] User ${userId} đã xem sản phẩm ${productId} từ kết quả tìm kiếm "${searchQuery}"`);
      
      return res.status(200).json(viewResult);
    } catch (error) {
      console.error("Lỗi khi lưu hành vi:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Lỗi server khi lưu hành vi" 
      });
    }
  } catch (error) {
    console.error("Lỗi khi theo dõi sản phẩm từ tìm kiếm:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
}; 