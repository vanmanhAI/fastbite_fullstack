import { Not, IsNull, Like, In } from "typeorm";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { AppDataSource } from "../config/database";
import { extractKeywords } from "../utils/textProcessing";
import { ProductLike } from "../models/ProductLike";
import { User } from "../models/User";
import { ILike, MoreThan } from "typeorm";
import { calculateSimilarity, analyzeSentiment } from "../utils/textProcessing";

export class UserBehaviorService {
  private userBehaviorRepository = AppDataSource.getRepository(UserBehavior);
  private productLikeRepository = AppDataSource.getRepository(ProductLike);
  private productRepository = AppDataSource.getRepository(Product);
  private categoryRepository = AppDataSource.getRepository(Category);

  // Các trọng số mặc định cho các loại hành vi
  private behaviorWeights = {
    [BehaviorType.VIEW]: 1.0,           // Tăng từ 0.5 lên 0.8
    [BehaviorType.LIKE]: 5.0,           // Tăng trọng số thích lên 1.5
    [BehaviorType.ADD_TO_CART]: 3.0,    // Tăng trọng số giỏ hàng từ 2.5 lên 3.0
    [BehaviorType.PURCHASE]: 10.0,       // Tăng mạnh trọng số mua hàng
    [BehaviorType.REVIEW]: 7.0,         // Đảm bảo trọng số đánh giá cao hơn like
    [BehaviorType.SEARCH]: 0.5,         // Giữ nguyên trọng số tìm kiếm
    [BehaviorType.CLICK_CATEGORY]: 1.5  // Giữ nguyên trọng số click danh mục
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
      console.log(`[PERSONALIZER] Xử lý đề xuất cho user ${userId || 'khách'} với query: "${query}"`);
      const reasonings: string[] = [];
      let isNewUser = false;

      // Nếu không có query hoặc query quá ngắn, không thể sử dụng để tìm kiếm
      if (!query || query.trim().length < 2) {
        console.log("[PERSONALIZER] Query quá ngắn, sử dụng phương pháp dự phòng");
        return await this.getFallbackRecommendations(limit);
      }

      // Làm sạch query và tách từ khóa
      const cleanQuery = query.toLowerCase().trim();
      console.log(`[PERSONALIZER] Query sau khi làm sạch: "${cleanQuery}"`);
      
      // Kiểm tra xem người dùng đã có dữ liệu hành vi chưa
      const userBehaviorCount = await this.userBehaviorRepository.count({ where: { userId } });
      isNewUser = userBehaviorCount < 5; // Người dùng có ít hơn 5 hành vi được xem là mới
      
      if (isNewUser) {
        console.log(`[PERSONALIZER] Người dùng ${userId} là người dùng mới (${userBehaviorCount} hành vi)`);
        reasonings.push("bạn là người dùng mới");
      }

      // BƯỚC 1: Tìm sản phẩm khớp trực tiếp với query người dùng (ưu tiên cao nhất)
      console.log(`[PERSONALIZER] Tìm sản phẩm khớp trực tiếp với: "${cleanQuery}"`);
      const directMatchProducts = await this.productRepository.createQueryBuilder('product')
        .leftJoinAndSelect('product.categories', 'category')
        .where('product.isActive = :isActive', { isActive: true })
        .andWhere(
          '(LOWER(product.name) LIKE :query OR LOWER(product.description) LIKE :query OR LOWER(product.tags) LIKE :query)',
          { query: `%${cleanQuery}%` }
        )
        .orderBy('product.rating', 'DESC')
        .addOrderBy('product.numReviews', 'DESC')
        .take(limit)
        .getMany();
      
      console.log(`[PERSONALIZER] Tìm thấy ${directMatchProducts.length} sản phẩm khớp trực tiếp`);
      const directMatchIds = directMatchProducts.map(p => p.id);

      // BƯỚC 2: Nếu cần thêm sản phẩm, tìm sản phẩm dựa trên hành vi người dùng
      const remainingSlots = limit - directMatchProducts.length;
      let behaviorBasedProducts: Product[] = [];
      
      if (remainingSlots > 0 && !isNewUser && userId) {
        console.log(`[PERSONALIZER] Tìm thêm ${remainingSlots} sản phẩm dựa trên hành vi người dùng`);
        
        // Lấy các hành vi gần đây nhất của người dùng
        const userBehaviors = await this.userBehaviorRepository.find({
          where: { userId },
          order: { createdAt: 'DESC' },
          take: 30
        });
        
        if (userBehaviors.length > 0) {
          // Phân tích hành vi để xây dựng điểm số cho từng sản phẩm
          const viewCounts = new Map<number, number>();
          const likeCounts = new Map<number, number>();
          const cartCounts = new Map<number, number>();
          
          for (const behavior of userBehaviors) {
            if (behavior.behaviorType === BehaviorType.VIEW) {
              viewCounts.set(behavior.productId, (viewCounts.get(behavior.productId) || 0) + behavior.count);
            } else if (behavior.behaviorType === BehaviorType.LIKE) {
              likeCounts.set(behavior.productId, (likeCounts.get(behavior.productId) || 0) + behavior.count);
            } else if (behavior.behaviorType === BehaviorType.ADD_TO_CART) {
              cartCounts.set(behavior.productId, (cartCounts.get(behavior.productId) || 0) + behavior.count);
            }
          }
          
          // Tính điểm tổng cho mỗi sản phẩm
          const scores = new Map<number, number>();
          for (const [productId, viewCount] of viewCounts) {
            const likeCount = likeCounts.get(productId) || 0;
            const cartCount = cartCounts.get(productId) || 0;
            
            // Công thức tính điểm có trọng số cao cho thêm vào giỏ và thích
            scores.set(
              productId,
              viewCount * 1 + likeCount * 5 + cartCount * 10
            );
          }
          
          // Lấy các sản phẩm có điểm cao nhất
          const topProductIds = [...scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, remainingSlots * 2) // Lấy nhiều hơn để lọc trùng lặp
            .filter(([id]) => !directMatchIds.includes(id)) // Loại bỏ các ID đã có trong kết quả trực tiếp
            .map(([id]) => id);
          
          if (topProductIds.length > 0) {
            behaviorBasedProducts = await this.productRepository.createQueryBuilder('product')
              .leftJoinAndSelect('product.categories', 'category')
              .where('product.id IN (:...ids)', { ids: topProductIds })
              .andWhere('product.isActive = :isActive', { isActive: true })
              .orderBy('product.rating', 'DESC')
              .take(remainingSlots)
              .getMany();
            
            console.log(`[PERSONALIZER] Tìm thấy ${behaviorBasedProducts.length} sản phẩm dựa trên hành vi người dùng`);
            if (behaviorBasedProducts.length > 0) {
              reasonings.push("sở thích cá nhân của bạn");
            }
          }
        }
      }

      // BƯỚC 3: Nếu vẫn chưa đủ sản phẩm, thêm sản phẩm phổ biến
      const finalRemainingSlots = limit - (directMatchProducts.length + behaviorBasedProducts.length);
      let popularProducts: Product[] = [];
      
      if (finalRemainingSlots > 0) {
        console.log(`[PERSONALIZER] Tìm thêm ${finalRemainingSlots} sản phẩm phổ biến`);
        const existingIds = [
          ...directMatchIds,
          ...behaviorBasedProducts.map(p => p.id)
        ];
        
        popularProducts = await this.productRepository.createQueryBuilder('product')
          .leftJoinAndSelect('product.categories', 'category')
          .where('product.isActive = :isActive', { isActive: true })
          .andWhere(existingIds.length > 0 ? 'product.id NOT IN (:...existingIds)' : '1=1', 
            existingIds.length > 0 ? { existingIds } : {})
          .orderBy('product.rating', 'DESC')
          .addOrderBy('product.numReviews', 'DESC')
          .take(finalRemainingSlots)
          .getMany();
        
        console.log(`[PERSONALIZER] Tìm thấy ${popularProducts.length} sản phẩm phổ biến`);
        if (popularProducts.length > 0) {
          reasonings.push("món ăn phổ biến của nhà hàng");
        }
      }

      // Kết hợp tất cả kết quả - ưu tiên sản phẩm khớp trực tiếp lên đầu
      const combinedProducts = [
        ...directMatchProducts,
        ...behaviorBasedProducts,
        ...popularProducts
      ];
      
      // Nếu không tìm thấy sản phẩm nào, trả về kết quả dự phòng
      if (combinedProducts.length === 0) {
        console.log("[PERSONALIZER] Không tìm thấy sản phẩm nào, trả về kết quả dự phòng");
        return await this.getFallbackRecommendations(limit);
      }

      // Chuyển đổi kết quả sang định dạng phù hợp
      const responseProducts = combinedProducts.map((product, index) => {
        // Xác định loại gợi ý: khớp trực tiếp, dựa trên hành vi, hoặc phổ biến
        const isDirectMatch = index < directMatchProducts.length;
        const isBehaviorBased = index >= directMatchProducts.length && 
                               index < (directMatchProducts.length + behaviorBasedProducts.length);
        
        // Điều chỉnh lý do và độ tin cậy theo loại gợi ý
        let reasoning = "Món ăn phổ biến";
        let confidence = 0.6;
        
        if (isDirectMatch) {
          reasoning = "Phù hợp với yêu cầu của bạn";
          confidence = 0.95;
        } else if (isBehaviorBased) {
          reasoning = "Dựa trên sở thích của bạn";
          confidence = 0.8;
        }
        
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || '/images/placeholder-food.jpg',
          description: product.description || '',
          stock: product.stock || 0,
          category: product.categories?.[0]?.name || '',
          confidence,
          reasoning
        };
      });

      return {
        success: true,
        products: responseProducts,
        reasonings: [...new Set(reasonings)],
        isNewUser
      };
    } catch (error) {
      console.error("Lỗi khi tạo đề xuất cá nhân hóa:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định"
      };
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
}