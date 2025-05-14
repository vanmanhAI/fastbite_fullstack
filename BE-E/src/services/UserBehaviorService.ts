import { Not, IsNull, Like, In } from "typeorm";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { UserPreference, PreferenceType } from "../models/UserPreference";
import { ProductLike } from "../models/ProductLike";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { AppDataSource } from "../config/database";
import { extractKeywords } from "../utils/textProcessing";

export class UserBehaviorService {
  private userBehaviorRepository = AppDataSource.getRepository(UserBehavior);
  private preferenceRepository = AppDataSource.getRepository(UserPreference);
  private productLikeRepository = AppDataSource.getRepository(ProductLike);
  private productRepository = AppDataSource.getRepository(Product);
  private categoryRepository = AppDataSource.getRepository(Category);

  // Các trọng số mặc định cho các loại hành vi
  private behaviorWeights = {
    [BehaviorType.VIEW]: 0.8,           // Tăng từ 0.5 lên 0.8
    [BehaviorType.LIKE]: 1.5,           // Tăng trọng số thích lên 1.5
    [BehaviorType.ADD_TO_CART]: 3.0,    // Tăng trọng số giỏ hàng từ 2.5 lên 3.0
    [BehaviorType.PURCHASE]: 3.5,       // Tăng mạnh trọng số mua hàng
    [BehaviorType.REVIEW]: 2.0,         // Đảm bảo trọng số đánh giá cao hơn like
    [BehaviorType.SEARCH]: 0.4,         // Giữ nguyên trọng số tìm kiếm
    [BehaviorType.CLICK_CATEGORY]: 0.4  // Giữ nguyên trọng số click danh mục
  };

  // Lưu hành vi xem sản phẩm
  async trackProductView(userId: number, productId: number) {
    return this.trackBehavior(userId, productId, BehaviorType.VIEW);
  }

  // Lưu hành vi thích sản phẩm
  async trackProductLike(userId: number, productId: number, isLiked: boolean) {
    if (isLiked) {
      // Tạo bản ghi mới trong bảng ProductLike
      const existingLike = await this.productLikeRepository.findOne({
        where: { userId, productId }
      });

      if (!existingLike) {
        const newLike = this.productLikeRepository.create({
          userId,
          productId
        });
        await this.productLikeRepository.save(newLike);
      }

      // Lưu hành vi thích
      return this.trackBehavior(userId, productId, BehaviorType.LIKE);
    } else {
      // Xóa bản ghi trong bảng ProductLike
      await this.productLikeRepository.delete({ userId, productId });
      
      // Xóa hành vi thích
      const behavior = await this.userBehaviorRepository.findOne({
        where: { userId, productId, behaviorType: BehaviorType.LIKE }
      });
      
      if (behavior) {
        await this.userBehaviorRepository.remove(behavior);
      }
      
      return { success: true };
    }
  }

  // Lưu hành vi thêm vào giỏ hàng
  async trackAddToCart(userId: number, productId: number) {
    return this.trackBehavior(userId, productId, BehaviorType.ADD_TO_CART);
  }

  // Lưu hành vi mua sản phẩm
  async trackPurchase(userId: number, productId: number) {
    return this.trackBehavior(userId, productId, BehaviorType.PURCHASE);
  }

  // Lưu hành vi đánh giá sản phẩm
  async trackReview(userId: number, productId: number, rating: number, data?: string) {
    // Nếu không có data được cung cấp, tạo data cơ bản
    const reviewData = data || JSON.stringify({ rating });
    
    // Luôn tạo bản ghi mới cho đánh giá thay vì cập nhật bản ghi cũ
    try {
      console.log(`Tạo mới behavior đánh giá cho user ${userId}, product ${productId}, rating ${rating}`);
      const newBehavior = this.userBehaviorRepository.create({
        userId,
        productId,
        behaviorType: BehaviorType.REVIEW,
        data: reviewData,
        count: 1,
        weight: this.behaviorWeights[BehaviorType.REVIEW] || 1.0
      });
      
      const behavior = await this.userBehaviorRepository.save(newBehavior);
      return { success: true, behavior };
    } catch (error) {
      console.error("Error tracking review behavior:", error);
      return { success: false, error: "Failed to track review behavior" };
    }
  }

  // Lưu hành vi tìm kiếm với dữ liệu phong phú hơn
  async trackSearch(userId: number, searchQuery: string) {
    try {
      const query = searchQuery.trim();
      if (!query) return { success: false, message: "Từ khóa tìm kiếm trống" };

      // Trích xuất từ khóa từ query
      const keywords = this.extractSearchKeywords(query);
      
      // Tạo dữ liệu tìm kiếm phong phú
      const searchData = {
        query,
        keywords,
        timestamp: new Date().toISOString(),
        contextData: {
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().getDay()
        }
      };
      
      // Tìm sản phẩm liên quan đến từ khóa tìm kiếm
      const relatedProducts = await this.findRelatedProducts(query);
      if (relatedProducts.length > 0) {
        searchData["relatedProductIds"] = relatedProducts.map(p => p.id);
      }
      
      // Tìm danh mục liên quan đến từ khóa tìm kiếm
      const relatedCategories = await this.findRelatedCategories(query);
      if (relatedCategories.length > 0) {
        searchData["relatedCategoryIds"] = relatedCategories.map(c => c.id);
      }
      
      // Tính toán trọng số dựa trên chất lượng tìm kiếm
      const searchWeight = this.calculateSearchWeight(searchData);
      
      // Kiểm tra xem có bản ghi tìm kiếm tương tự đã tồn tại không
      const existingBehavior = await this.findSimilarSearchBehavior(userId, query);
      
      if (existingBehavior) {
        // Cập nhật bản ghi hiện có
        existingBehavior.count += 1;
        existingBehavior.data = JSON.stringify(searchData);
        existingBehavior.weight = searchWeight;
        await this.userBehaviorRepository.save(existingBehavior);
        return { success: true, behavior: existingBehavior };
      } else {
        // Tạo bản ghi mới
        const newBehavior = this.userBehaviorRepository.create({
          userId,
          productId: null,
          behaviorType: BehaviorType.SEARCH,
          data: JSON.stringify(searchData),
          count: 1,
          weight: searchWeight
        });
        
        const savedBehavior = await this.userBehaviorRepository.save(newBehavior);
        return { success: true, behavior: savedBehavior };
      }
    } catch (error) {
      console.error("Error tracking search behavior:", error);
      return { success: false, error: "Failed to track search" };
    }
  }
  
  // Tìm kiếm sản phẩm liên quan đến từ khóa
  private async findRelatedProducts(query: string, limit: number = 5): Promise<Product[]> {
    return this.productRepository.createQueryBuilder("product")
      .where("LOWER(product.name) LIKE :query OR LOWER(product.description) LIKE :query OR LOWER(product.tags) LIKE :query")
      .setParameter("query", `%${query.toLowerCase()}%`)
      .limit(limit)
      .getMany();
  }
  
  // Tìm kiếm danh mục liên quan đến từ khóa
  private async findRelatedCategories(query: string, limit: number = 3): Promise<Category[]> {
    return this.categoryRepository.createQueryBuilder("category")
      .where("LOWER(category.name) LIKE :query OR LOWER(category.description) LIKE :query")
      .setParameter("query", `%${query.toLowerCase()}%`)
      .limit(limit)
      .getMany();
  }
  
  // Trích xuất từ khóa từ câu tìm kiếm
  private extractSearchKeywords(query: string): string[] {
    // Loại bỏ stop words và trích xuất từ khóa chính
    try {
      // Nếu có hàm extractKeywords, sử dụng nó
      if (typeof extractKeywords === 'function') {
        return extractKeywords(query);
      }
      
      // Nếu không, sử dụng phương pháp đơn giản
      const stopWords = ["và", "hoặc", "là", "có", "một", "những", "các", "để", "tôi", "muốn", "cần", "cho"];
      const words = query.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '') // Loại bỏ ký tự đặc biệt
        .split(/\s+/)
        .filter(word => word.length > 1 && !stopWords.includes(word));
      
      return [...new Set(words)]; // Loại bỏ từ trùng lặp
    } catch (error) {
      console.error("Error extracting keywords:", error);
      return query.toLowerCase().split(/\s+/);
    }
  }
  
  // Xác định thời điểm trong ngày
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  
  // Tính toán trọng số cho tìm kiếm dựa trên chất lượng
  private calculateSearchWeight(searchData: any): number {
    const baseWeight = this.behaviorWeights[BehaviorType.SEARCH] || 0.4;
    
    // Độ dài từ khóa (tìm kiếm cụ thể có giá trị hơn)
    const keywordFactor = Math.min(1.5, 0.8 + (searchData.keywords?.length || 0) * 0.1);
    
    // Yếu tố liên quan đến sản phẩm
    const productRelevanceFactor = searchData.relatedProductIds?.length 
      ? Math.min(1.5, 1 + searchData.relatedProductIds.length * 0.1)
      : 0.8;
    
    return baseWeight * keywordFactor * productRelevanceFactor;
  }
  
  // Tìm bản ghi tìm kiếm tương tự đã tồn tại
  private async findSimilarSearchBehavior(userId: number, query: string): Promise<UserBehavior | null> {
    // Tìm các hành vi tìm kiếm gần đây với cùng từ khóa
    const behaviors = await this.userBehaviorRepository.find({
      where: {
        userId,
        behaviorType: BehaviorType.SEARCH,
        data: Like(`%${query}%`)
      },
      order: { createdAt: "DESC" },
      take: 3
    });
    
    if (behaviors.length === 0) return null;
    
    // Kiểm tra tính tương tự
    for (const behavior of behaviors) {
      try {
        const data = JSON.parse(behavior.data);
        if (data.query && this.calculateQuerySimilarity(data.query, query) > 0.8) {
          return behavior;
        }
      } catch (e) {
        console.error("Error parsing behavior data:", e);
      }
    }
    
    return null;
  }
  
  // Tính toán độ tương tự giữa hai câu tìm kiếm
  private calculateQuerySimilarity(query1: string, query2: string): number {
    query1 = query1.toLowerCase().trim();
    query2 = query2.toLowerCase().trim();
    
    // Trường hợp giống nhau hoàn toàn
    if (query1 === query2) return 1.0;
    
    // Trích xuất từ khóa và so sánh
    const keywords1 = this.extractSearchKeywords(query1);
    const keywords2 = this.extractSearchKeywords(query2);
    
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    // Tính số từ khóa chung
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    
    // Tính độ tương tự dựa trên số từ khóa chung
    return commonKeywords.length / Math.max(keywords1.length, keywords2.length);
  }
  
  // Liên kết hành vi tìm kiếm với xem sản phẩm
  async trackProductViewFromSearch(userId: number, productId: number, searchQuery: string) {
    try {
      // Lưu hành vi xem sản phẩm
      const viewResult = await this.trackProductView(userId, productId);
      
      // Cập nhật hành vi tìm kiếm, thêm sản phẩm đã xem từ kết quả tìm kiếm
      const searchBehavior = await this.findSimilarSearchBehavior(userId, searchQuery);
      
      if (searchBehavior) {
        try {
          const data = JSON.parse(searchBehavior.data);
          if (!data.clickedProductIds) data.clickedProductIds = [];
          if (!data.clickedProductIds.includes(productId)) {
            data.clickedProductIds.push(productId);
            data.lastClickTimestamp = new Date().toISOString();
            searchBehavior.data = JSON.stringify(data);
            await this.userBehaviorRepository.save(searchBehavior);
          }
        } catch (e) {
          console.error("Error updating search-view link:", e);
        }
      }
      
      return viewResult;
    } catch (error) {
      console.error("Error linking behaviors:", error);
      return { success: false, error: "Failed to link behaviors" };
    }
  }
  
  // Phân tích hành vi tìm kiếm của người dùng
  async getSearchAnalytics(userId: number, limit: number = 50) {
    try {
      const searchBehaviors = await this.userBehaviorRepository.find({
        where: {
          userId,
          behaviorType: BehaviorType.SEARCH
        },
        order: { createdAt: "DESC" },
        take: limit
      });
      
      // Tổng hợp dữ liệu phân tích
      const keywordFrequency = {};
      const queryHistory = [];
      const timeDistribution = {
        morning: 0,
        afternoon: 0,
        evening: 0
      };
      const relatedProducts = {};
      const relatedCategories = {};
      
      searchBehaviors.forEach(behavior => {
        try {
          const data = JSON.parse(behavior.data);
          
          // Lưu trữ query history
          queryHistory.push({
            query: data.query,
            timestamp: data.timestamp || behavior.createdAt,
            count: behavior.count
          });
          
          // Thống kê từ khóa
          if (data.keywords && Array.isArray(data.keywords)) {
            data.keywords.forEach(keyword => {
              keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
            });
          }
          
          // Thống kê thời gian tìm kiếm
          if (data.contextData && data.contextData.timeOfDay) {
            timeDistribution[data.contextData.timeOfDay]++;
          }
          
          // Thống kê sản phẩm liên quan
          if (data.relatedProductIds && Array.isArray(data.relatedProductIds)) {
            data.relatedProductIds.forEach(prodId => {
              relatedProducts[prodId] = (relatedProducts[prodId] || 0) + 1;
            });
          }
          
          // Thống kê danh mục liên quan
          if (data.relatedCategoryIds && Array.isArray(data.relatedCategoryIds)) {
            data.relatedCategoryIds.forEach(catId => {
              relatedCategories[catId] = (relatedCategories[catId] || 0) + 1;
            });
          }
        } catch (e) {
          console.error("Error analyzing search data:", e);
        }
      });
      
      return {
        success: true,
        analytics: {
          totalSearches: searchBehaviors.length,
          recentQueries: queryHistory.slice(0, 10),
          keywordFrequency: Object.entries(keywordFrequency)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 10),
          timeDistribution,
          topRelatedProducts: Object.entries(relatedProducts)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5)
            .map(entry => ({ productId: parseInt(entry[0]), count: entry[1] })),
          topRelatedCategories: Object.entries(relatedCategories)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5)
            .map(entry => ({ categoryId: parseInt(entry[0]), count: entry[1] }))
        }
      };
    } catch (error) {
      console.error("Error analyzing search behaviors:", error);
      return { success: false, error: "Failed to analyze search behaviors" };
    }
  }
  
  // Lấy đề xuất sản phẩm dựa trên lịch sử tìm kiếm
  async getRecommendationsBySearchHistory(userId: number, limit: number = 10) {
    try {
      // Lấy lịch sử tìm kiếm gần đây
      const searchBehaviors = await this.userBehaviorRepository.find({
      where: {
        userId,
          behaviorType: BehaviorType.SEARCH
        },
        order: { createdAt: "DESC" },
        take: 20 // Lấy 20 kết quả tìm kiếm gần nhất
      });
      
      // Trích xuất từ khóa và sản phẩm liên quan
      const keywords = new Set<string>();
      const relatedProductIds = new Set<number>();
      const relatedCategoryIds = new Set<number>();
      
      searchBehaviors.forEach(behavior => {
        try {
          const data = JSON.parse(behavior.data);
          
          // Thu thập từ khóa
          if (data.keywords && Array.isArray(data.keywords)) {
            data.keywords.forEach(k => keywords.add(k));
          }
          
          // Thu thập sản phẩm liên quan
          if (data.relatedProductIds && Array.isArray(data.relatedProductIds)) {
            data.relatedProductIds.forEach(id => relatedProductIds.add(id));
          }
          
          // Thu thập danh mục liên quan
          if (data.relatedCategoryIds && Array.isArray(data.relatedCategoryIds)) {
            data.relatedCategoryIds.forEach(id => relatedCategoryIds.add(id));
          }
          
          // Thu thập sản phẩm đã click
          if (data.clickedProductIds && Array.isArray(data.clickedProductIds)) {
            data.clickedProductIds.forEach(id => relatedProductIds.add(id));
          }
        } catch (e) {
          console.error("Error parsing search behavior:", e);
        }
      });
      
      // Tìm sản phẩm liên quan đến từ khóa và danh mục
      let recommendedProducts: Product[] = [];
      
      if (keywords.size > 0 || relatedCategoryIds.size > 0) {
        let query = this.productRepository.createQueryBuilder("product")
          .where("product.isActive = :isActive", { isActive: true });
        
        // Lọc theo từ khóa
        if (keywords.size > 0) {
          const keywordArray = Array.from(keywords);
          const keywordConditions = keywordArray.map((kw, index) => 
            `(LOWER(product.name) LIKE :kw${index} OR LOWER(product.description) LIKE :kw${index} OR LOWER(product.tags) LIKE :kw${index})`
          ).join(" OR ");
          
          const keywordParams = {};
          keywordArray.forEach((kw, index) => {
            keywordParams[`kw${index}`] = `%${kw.toLowerCase()}%`;
          });
          
          query = query.andWhere(`(${keywordConditions})`, keywordParams);
        }
        
        // Lọc theo danh mục
        if (relatedCategoryIds.size > 0) {
          const categoryArray = Array.from(relatedCategoryIds);
          query = query
            .leftJoin("product.categories", "category")
            .andWhere("category.id IN (:...categoryIds)", { categoryIds: categoryArray });
        }
        
        recommendedProducts = await query
          .orderBy("product.rating", "DESC")
          .limit(limit)
          .getMany();
      }
      
      // Thêm sản phẩm liên quan trực tiếp nếu chưa đủ
      if (recommendedProducts.length < limit && relatedProductIds.size > 0) {
        const directProductIds = Array.from(relatedProductIds);
        const directProducts = await this.productRepository.find({
          where: { 
            id: In(directProductIds),
            isActive: true
          },
          order: { rating: "DESC" },
          take: limit - recommendedProducts.length
        });
        
        // Thêm vào kết quả, tránh trùng lặp
        const existingIds = new Set(recommendedProducts.map(p => p.id));
        for (const product of directProducts) {
          if (!existingIds.has(product.id)) {
            recommendedProducts.push(product);
            existingIds.add(product.id);
          }
        }
      }
      
      return {
        success: true,
        products: recommendedProducts,
        metadata: {
          source: "search_history",
          keywordCount: keywords.size,
          relatedProductCount: relatedProductIds.size,
          relatedCategoryCount: relatedCategoryIds.size
        }
      };
    } catch (error) {
      console.error("Error getting recommendations from search history:", error);
      return { success: false, error: "Failed to get recommendations" };
    }
  }

  /**
   * Lấy đề xuất cá nhân hóa cho chatbot
   */
  async getPersonalizedChatRecommendations(
    userId: number,
    query: string = "",
    limit: number = 5
  ): Promise<{
    success: boolean;
    products?: any[];
    reasonings?: string[];
    isNewUser?: boolean;
    error?: string;
  }> {
    try {
      console.log(`[CHAT RECOMMENDATION] Lấy đề xuất cho user ${userId}, query: "${query}", limit: ${limit}`);
      
      // Kiểm tra xem người dùng có hành vi nào không
      const userBehaviorCount = await this.userBehaviorRepository.count({
        where: { userId }
      });
      
      // Đánh dấu người dùng mới nếu không có hành vi nào
      const isNewUser = userBehaviorCount === 0;
      
      // Sử dụng trọng số từ thuộc tính behaviorWeights để đảm bảo nhất quán
      const weights = {
        purchase: this.behaviorWeights[BehaviorType.PURCHASE],
        like: this.behaviorWeights[BehaviorType.LIKE],
        view: this.behaviorWeights[BehaviorType.VIEW],
        cart: this.behaviorWeights[BehaviorType.ADD_TO_CART],
        search: this.behaviorWeights[BehaviorType.SEARCH],
        review: this.behaviorWeights[BehaviorType.REVIEW]
      };

      // Nếu không có hành vi nào, trả về sản phẩm phổ biến với cờ isNewUser
      if (userBehaviorCount === 0) {
        console.log(`[CHAT RECOMMENDATION] User ${userId} là người dùng mới, trả về sản phẩm phổ biến`);
        
        const popularProducts = await this.productRepository.find({
          where: { isActive: true },
          order: { rating: "DESC" },
          take: limit
        });

        const formattedProducts = popularProducts.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
          description: product.description,
          stock: product.stock
        }));

        return {
          success: true,
          products: formattedProducts,
          reasonings: ["Sản phẩm phổ biến"],
          isNewUser: true
        };
      }

      // Lấy hành vi người dùng gần đây nhất
      const recentBehaviors = await this.userBehaviorRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
        take: 50  // Tăng số lượng hành vi để phân tích chính xác hơn
      });
      
      if (recentBehaviors.length === 0) {
        // Trường hợp dự phòng nếu có count nhưng không lấy được behaviors
        return this.getFallbackRecommendations(limit);
      }

      // Hằng số thời gian để tính trọng số dựa vào thời gian
      const now = new Date();
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      
      // Đánh giá sản phẩm dựa trên hành vi
      const productScores: Record<number, { 
        score: number; 
        reasons: string[];
        lastInteraction: Date;
        interactionTypes: Set<string>;
      }> = {};
      
      // Tập hợp sản phẩm đã tương tác để lấy thông tin chi tiết
      const productIds = new Set<number>();
      
      // Xử lý từng hành vi và cập nhật điểm sản phẩm
      recentBehaviors.forEach(behavior => {
        // Chỉ xử lý hành vi liên quan đến sản phẩm
        if (behavior.productId) {
          productIds.add(behavior.productId);
          
          if (!productScores[behavior.productId]) {
            productScores[behavior.productId] = { 
              score: 0, 
              reasons: [],
              lastInteraction: behavior.createdAt,
              interactionTypes: new Set<string>()
            };
          }
          
          // Tính số ngày kể từ lần tương tác này
          const daysAgo = (now.getTime() - new Date(behavior.createdAt).getTime()) / millisecondsPerDay;
          
          // Hệ số thời gian: hành vi gần đây có trọng số cao hơn
          const timeMultiplier = Math.exp(-daysAgo/10);

          // Cập nhật thời gian tương tác cuối nếu hành vi này mới hơn
          if (behavior.createdAt > productScores[behavior.productId].lastInteraction) {
            productScores[behavior.productId].lastInteraction = behavior.createdAt;
          }
          
          // Tính điểm theo loại hành vi
          let behaviorWeight = 0;
          let reason = "";
          let behaviorTypeName = "";
          
          switch (behavior.behaviorType) {
            case BehaviorType.PURCHASE:
              behaviorWeight = weights.purchase * Math.min(behavior.count, 3) * timeMultiplier;
              reason = "sản phẩm đã mua";
              behaviorTypeName = "purchase";
              break;
              
            case BehaviorType.LIKE:
              behaviorWeight = weights.like * timeMultiplier;
              reason = "sản phẩm đã thích";
              behaviorTypeName = "like";
              break;
              
            case BehaviorType.VIEW:
              behaviorWeight = weights.view * Math.log2(behavior.count + 1) * timeMultiplier;
              reason = "sản phẩm đã xem";
              behaviorTypeName = "view";
              break;
              
            case BehaviorType.ADD_TO_CART:
              behaviorWeight = weights.cart * timeMultiplier;
              reason = "sản phẩm đã thêm vào giỏ hàng";
              behaviorTypeName = "cart";
              break;
              
            case BehaviorType.REVIEW:
              let reviewScore = weights.review;
              try {
                if (behavior.data) {
                  const reviewData = JSON.parse(behavior.data);
                  if (reviewData && reviewData.rating) {
                    reviewScore = weights.review * (0.6 + reviewData.rating / 10);
                  }
                }
              } catch (e) {
                console.error('Lỗi khi phân tích dữ liệu đánh giá:', e);
              }
              
              behaviorWeight = reviewScore * timeMultiplier;
              reason = "sản phẩm đã đánh giá";
              behaviorTypeName = "review";
              break;
          }

          productScores[behavior.productId].score += behaviorWeight;
          productScores[behavior.productId].interactionTypes.add(behaviorTypeName);
          
          // Chỉ thêm lý do nếu chưa có
          if (!productScores[behavior.productId].reasons.includes(reason) && reason) {
            productScores[behavior.productId].reasons.push(reason);
          }
        }
      });

      if (productIds.size === 0) {
        // Không có sản phẩm nào được tìm thấy từ hành vi
        return this.getFallbackRecommendations(limit);
      }

      // Lấy thông tin chi tiết của các sản phẩm
      const products = await this.productRepository.find({
        where: { id: In([...productIds]), isActive: true },
        relations: ["categories"]
      });

      // Thu thập thông tin danh mục
      const categoryScores: Record<number, number> = {};
      const topCategories: number[] = [];
      
      // Tính điểm danh mục từ sản phẩm đã tương tác
      products.forEach(product => {
        if (product.categories && product.categories.length > 0) {
          product.categories.forEach(category => {
            if (!categoryScores[category.id]) {
              categoryScores[category.id] = 0;
            }
            categoryScores[category.id] += (productScores[product.id]?.score || 0) * 0.5;
          });
        }
      });
      
      // Lấy top 3 danh mục được ưa thích nhất
      if (Object.keys(categoryScores).length > 0) {
        const sortedCategories = Object.entries(categoryScores)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 3)
          .map(entry => parseInt(entry[0]));
          
        topCategories.push(...sortedCategories);
      }
      
      // Tìm thêm sản phẩm từ danh mục được ưa thích
      try {
        if (topCategories.length > 0) {
          const existingProductIds = new Set(products.map(p => p.id));
          
          const categoryProducts = await this.productRepository
            .createQueryBuilder("product")
            .leftJoin("product.categories", "category")
            .where("category.id IN (:...categoryIds)", { categoryIds: topCategories })
            .andWhere("product.isActive = :isActive", { isActive: true })
            .andWhere("product.id NOT IN (:...existingIds)", { 
              existingIds: existingProductIds.size > 0 ? [...existingProductIds] : [0] 
            })
            .orderBy("product.rating", "DESC")
            .take(Math.min(5, limit))
            .getMany();
            
          // Thêm sản phẩm từ danh mục ưa thích
          categoryProducts.forEach(product => {
            productIds.add(product.id);
            products.push(product);
            
            const matchingCategoryIds = topCategories
              .filter(catId => product.categories.some(cat => cat.id === catId));
            const matchingCount = matchingCategoryIds.length;
            
            const reason = "thuộc danh mục bạn quan tâm";
            
            productScores[product.id] = {
              score: 0.3 * Math.max(1, matchingCount), // Điểm thấp hơn sản phẩm đã tương tác trực tiếp
              reasons: [reason],
              lastInteraction: new Date(now.getTime() - 30 * millisecondsPerDay), // Giả định tương tác cũ hơn
              interactionTypes: new Set(["category"])
            };
          });
        }
      } catch (error) {
        console.error('Lỗi khi tìm sản phẩm từ danh mục:', error);
      }
      
      // Xử lý query tìm kiếm nếu có
      try {
        if (query && query.trim().length > 0) {
          const keywords = this.extractSearchKeywords(query.trim());
          const existingProductIds = new Set(products.map(p => p.id));
          
          if (keywords.length > 0) {
            let queryBuilder = this.productRepository.createQueryBuilder("product")
              .where("product.isActive = :isActive", { isActive: true })
              .andWhere("product.id NOT IN (:...existingIds)", { 
                existingIds: existingProductIds.size > 0 ? [...existingProductIds] : [0] 
              });
              
            // Tạo điều kiện tìm kiếm
            const keywordConditions = keywords.map((kw, index) => 
              `(LOWER(product.name) LIKE :kw${index} OR LOWER(product.description) LIKE :kw${index} OR LOWER(product.tags) LIKE :kw${index})`
            ).join(" OR ");
            
            const keywordParams = {};
            keywords.forEach((kw, index) => {
              keywordParams[`kw${index}`] = `%${kw.toLowerCase()}%`;
            });
            
            queryBuilder = queryBuilder.andWhere(`(${keywordConditions})`, keywordParams);
            
            // Lấy sản phẩm phù hợp với từ khóa
            const queryProducts = await queryBuilder
              .orderBy("product.rating", "DESC")
              .take(limit)
              .getMany();
              
            // Thêm sản phẩm từ query
            queryProducts.forEach(product => {
              productIds.add(product.id);
              products.push(product);
              
              // Đánh giá mức độ phù hợp
              let matchCount = 0;
              keywords.forEach(kw => {
                const kwLower = kw.toLowerCase();
                if (product.name.toLowerCase().includes(kwLower) ||
                    (product.description && product.description.toLowerCase().includes(kwLower)) ||
                    (product.tags && product.tags.toLowerCase().includes(kwLower))) {
                  matchCount++;
                }
              });
              
              productScores[product.id] = {
                score: 0.3 + matchCount * 0.2, // Điểm dựa trên độ phù hợp
                reasons: ["phù hợp với yêu cầu của bạn"],
                lastInteraction: new Date(),  // Đặt thời gian tương tác mới nhất
                interactionTypes: new Set(["search"])
              };
            });
          }
        }
      } catch (error) {
        console.error('Lỗi khi xử lý query tìm kiếm:', error);
      }
      
      // Tính điểm đa dạng cho các sản phẩm
      products.forEach(product => {
        if (!productScores[product.id]) return;
        
        // Tăng điểm nếu có nhiều loại tương tác khác nhau
        const diversityBonus = productScores[product.id].interactionTypes.size * 0.2;
        productScores[product.id].score += diversityBonus;
      });
      
      // Chuyển đổi thành mảng sản phẩm có điểm và sắp xếp
      const scoredProducts = products.map(product => {
        const scoreInfo = productScores[product.id];
        if (!scoreInfo) return null;
        
        // Tạo lý do đề xuất
        const reasonComponents = [];
        
        if (scoreInfo.reasons.length > 0) {
          reasonComponents.push(...scoreInfo.reasons);
        }
        
        // Thêm thông tin danh mục nếu phù hợp
        if (product.categories && product.categories.length > 0) {
          const matchingCategoryIds = topCategories
            .filter(catId => product.categories.some(cat => cat.id === catId));
          const matchingCount = matchingCategoryIds.length;
          
          if (matchingCount > 0 && !reasonComponents.includes("thuộc danh mục bạn quan tâm")) {
            reasonComponents.push("thuộc danh mục bạn quan tâm");
          }
        }
        
        // Tạo chuỗi lý do đầy đủ
        let reasoning = "";
        if (reasonComponents.length > 0) {
          reasoning = `Được đề xuất vì đây là ${reasonComponents.join(" và ")}`;
        } else {
          reasoning = "Sản phẩm phổ biến phù hợp với bạn";
        }
        
        return {
          ...product,
          score: scoreInfo.score,
          reasoning,
          lastInteraction: scoreInfo.lastInteraction
        };
      }).filter(Boolean).filter(p => p.score > 0);
      
      // Sắp xếp theo điểm và thời gian tương tác
      scoredProducts.sort((a, b) => {
        // So sánh điểm, ưu tiên điểm cao hơn
        if (Math.abs(b.score - a.score) > 0.2) {
          return b.score - a.score;
        }
        
        // Nếu điểm gần bằng nhau, ưu tiên sản phẩm có tương tác gần đây hơn
        return b.lastInteraction.getTime() - a.lastInteraction.getTime();
      });

      // Thu thập tất cả lý do đề xuất
      const allReasons = new Set<string>();
      scoredProducts.slice(0, limit).forEach(product => {
        if (productScores[product.id]?.reasons) {
          productScores[product.id].reasons.forEach(reason => {
            allReasons.add(reason);
          });
        }
      });

      // Định dạng kết quả trả về
      const formattedProducts = scoredProducts.slice(0, limit).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock,
        reasoning: product.reasoning,
        score: product.score
      }));
      
      // Nếu không đủ sản phẩm, bổ sung thêm sản phẩm phổ biến
      if (formattedProducts.length < limit) {
        const additionalProducts = await this.getAdditionalProducts(
          formattedProducts.map(p => p.id),
          limit - formattedProducts.length
        );
        
        formattedProducts.push(...additionalProducts);
      }
      
      // Log kết quả để theo dõi
      console.log(`[RECOMMENDATION] User ${userId} - Số sản phẩm đề xuất: ${formattedProducts.length}`);
      formattedProducts.forEach((p, i) => {
        const originalProduct = scoredProducts.find(sp => sp.id === p.id);
        if (originalProduct) {
          console.log(`  ${i+1}. ${p.name} - Điểm: ${originalProduct.score.toFixed(2)} - Lý do: ${p.reasoning}`);
        } else {
          console.log(`  ${i+1}. ${p.name} - Điểm: N/A (sản phẩm bổ sung) - Lý do: Sản phẩm phổ biến`);
        }
      });
      
      return {
        success: true,
        products: formattedProducts,
        reasonings: Array.from(allReasons),
        isNewUser: false
      };
    } catch (error) {
      console.error("Lỗi khi lấy đề xuất cá nhân hóa:", error);
      return this.getFallbackRecommendations(limit);
    }
  }
  
  /**
   * Phương thức dự phòng để lấy sản phẩm phổ biến khi không có đề xuất cá nhân hóa
   */
  private async getFallbackRecommendations(limit: number = 5): Promise<{
    success: boolean;
    products?: any[];
    reasonings?: string[];
    isNewUser?: boolean;
    error?: string;
  }> {
    try {
      console.log(`[RECOMMENDATION] Sử dụng đề xuất dự phòng với ${limit} sản phẩm`);
      
      const popularProducts = await this.productRepository.find({
        where: { isActive: true },
        order: { rating: "DESC" },
        take: limit
      });

      const formattedProducts = popularProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock,
        reasoning: "Sản phẩm được ưa chuộng"
      }));

      return {
        success: true,
        products: formattedProducts,
        reasonings: ["Sản phẩm phổ biến"],
        isNewUser: false
      };
    } catch (error) {
      console.error("Lỗi khi lấy đề xuất dự phòng:", error);
      return {
        success: false,
        error: "Không thể lấy đề xuất sản phẩm"
      };
    }
  }
  
  /**
   * Lấy thêm sản phẩm phổ biến khi không đủ số lượng từ đề xuất cá nhân hóa
   */
  private async getAdditionalProducts(existingIds: number[], limit: number): Promise<any[]> {
    try {
      if (limit <= 0) return [];
      
      console.log(`[RECOMMENDATION] Lấy thêm ${limit} sản phẩm phổ biến`);
      
      const additionalProducts = await this.productRepository
        .createQueryBuilder("product")
        .where("product.isActive = :isActive", { isActive: true })
        .andWhere("product.id NOT IN (:...existingIds)", { 
          existingIds: existingIds.length > 0 ? existingIds : [0] 
        })
        .orderBy("product.rating", "DESC")
        .take(limit)
        .getMany();
        
      return additionalProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
        description: product.description,
        stock: product.stock,
        reasoning: "Sản phẩm phổ biến bạn có thể quan tâm"
      }));
    } catch (error) {
      console.error("Lỗi khi lấy thêm sản phẩm:", error);
      return [];
    }
  }

  // Lưu sở thích người dùng
  async saveUserPreference(
    userId: number, 
    preferenceType: PreferenceType, 
    value: string, 
    categoryId?: number
  ) {
    try {
      // Kiểm tra nếu sở thích đã tồn tại
      const existingPref = await this.preferenceRepository.findOne({
        where: {
          userId,
          preferenceType,
          value
        }
      });
      
      if (existingPref) {
        return { success: true, preference: existingPref };
      }
      
      // Tạo mới sở thích
      const newPreference = this.preferenceRepository.create({
        userId,
        preferenceType,
        value,
        categoryId: categoryId || null
      });
      
      const preference = await this.preferenceRepository.save(newPreference);
      return { success: true, preference };
    } catch (error) {
      console.error("Error saving user preference:", error);
      return { success: false, error: "Failed to save preference" };
    }
  }

  // Xóa sở thích người dùng
  async removeUserPreference(preferenceId: number, userId: number) {
    try {
      const preference = await this.preferenceRepository.findOne({
        where: { id: preferenceId, userId }
      });
      
      if (!preference) {
        return { success: false, message: "Preference not found" };
      }
      
      await this.preferenceRepository.remove(preference);
      return { success: true };
    } catch (error) {
      console.error("Error removing user preference:", error);
      return { success: false, error: "Failed to remove preference" };
    }
  }

  // Lấy sở thích người dùng
  async getUserPreferences(userId: number) {
    try {
      const preferences = await this.preferenceRepository.find({
        where: { userId },
        relations: ["category"]
      });
      
      return { success: true, preferences };
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return { success: false, error: "Failed to fetch preferences" };
    }
  }

  // Phương thức chung để lưu hành vi
  private async trackBehavior(
    userId: number, 
    productId: number | null, 
    behaviorType: BehaviorType, 
    data: string = null
  ) {
    try {
      const whereClause: any = {
        userId,
        behaviorType
      };
      
      if (productId) {
        whereClause.productId = productId;
      } else {
        whereClause.productId = IsNull();
      }
      
      // Tìm hành vi đã tồn tại
      let behavior = await this.userBehaviorRepository.findOne({
        where: whereClause
      });
      
      if (behavior) {
        // Cập nhật hành vi đã tồn tại
        console.log(`Cập nhật behavior hiện có ID ${behavior.id} (count: ${behavior.count} -> ${behavior.count + 1})`);
        behavior.count += 1;
        behavior.data = data !== null ? data : behavior.data;
        
        // Tính toán trọng số mới với trọng số bổ sung cho hành vi thường xuyên
        const baseWeight = this.behaviorWeights[behaviorType] || 1.0;
        
        // Tăng trọng số cho hành vi ADD_TO_CART theo luỹ thừa
        if (behaviorType === BehaviorType.ADD_TO_CART) {
          const frequencyMultiplier = Math.log10(behavior.count + 1) + 1;
          behavior.weight = baseWeight * frequencyMultiplier;
          console.log(`[Behavior] Tăng trọng số ADD_TO_CART: ${behavior.weight.toFixed(2)} (count=${behavior.count})`);
        } else {
          // Hành vi khác tăng nhẹ theo logarithm của số lần
          behavior.weight = baseWeight * (1 + Math.log10(behavior.count) * 0.2);
        }
        
        await this.userBehaviorRepository.save(behavior);
      } else {
        // Tạo hành vi mới
        console.log(`Tạo behavior mới: User ${userId}, Product ${productId}, Type ${behaviorType}`);
        const newBehavior = this.userBehaviorRepository.create({
          userId,
          productId,
          behaviorType,
          count: 1,
          weight: this.behaviorWeights[behaviorType] || 1.0,
          data
        });
        
        await this.userBehaviorRepository.save(newBehavior);
      }
      
      // Cập nhật lượt thích cho sản phẩm nếu là hành vi LIKE
      if (behaviorType === BehaviorType.LIKE && productId) {
        await this.updateProductLikes(productId);
      }
      
      return true;
    } catch (error) {
      console.error(`Lỗi khi ghi lại hành vi: ${error}`);
      return false;
    }
  }

  /**
   * Cập nhật số lượt thích cho sản phẩm
   */
  private async updateProductLikes(productId: number): Promise<void> {
    try {
      const productRepository = AppDataSource.getRepository(Product);
      
      // Đếm số lượt LIKE cho sản phẩm
      const likeCount = await this.userBehaviorRepository.count({
        where: {
          productId,
          behaviorType: BehaviorType.LIKE
        }
      });
      
      // Cập nhật trường likeCount trong bảng products
      await productRepository.update(productId, { likeCount });
      
    } catch (error) {
      console.error(`Lỗi khi cập nhật lượt thích sản phẩm: ${error}`);
    }
  }

  // Lưu hành vi click vào danh mục
  async trackCategoryClick(userId: number, categoryId: number) {
    try {
      // Kiểm tra danh mục có tồn tại không
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId }
      });
      
      if (!category) {
        return { success: false, message: "Danh mục không tồn tại" };
      }
      
      // Tạo dữ liệu cho hành vi
      const data = JSON.stringify({
        categoryId,
        categoryName: category.name,
        timestamp: new Date().toISOString()
      });
      
      // Tìm kiếm hành vi đã tồn tại
      let behavior = await this.userBehaviorRepository.findOne({
        where: {
          userId,
          behaviorType: BehaviorType.CLICK_CATEGORY,
          data: Like(`%"categoryId":${categoryId}%`)
        }
      });
      
      if (behavior) {
        // Cập nhật hành vi đã tồn tại
        behavior.count += 1;
        behavior.data = data;
        await this.userBehaviorRepository.save(behavior);
      } else {
        // Tạo hành vi mới
        const newBehavior = this.userBehaviorRepository.create({
          userId,
          productId: null,
          behaviorType: BehaviorType.CLICK_CATEGORY,
          data,
          count: 1,
          weight: this.behaviorWeights[BehaviorType.CLICK_CATEGORY] || 0.4
        });
        
        behavior = await this.userBehaviorRepository.save(newBehavior);
      }
      
      return { success: true, behavior };
    } catch (error) {
      console.error("Error tracking category click:", error);
      return { success: false, error: "Failed to track category click" };
    }
  }
} 