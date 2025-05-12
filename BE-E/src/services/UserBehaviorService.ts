import { Not, IsNull, Like, In } from "typeorm";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { UserPreference, PreferenceType } from "../models/UserPreference";
import { ProductLike } from "../models/ProductLike";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { AppDataSource } from "../config/database";
import { extractKeywords } from "../utils/textProcessing";

export class UserBehaviorService {
  private behaviorRepository;
  private preferenceRepository;
  private productLikeRepository;
  private productRepository;
  private categoryRepository;

  constructor() {
    this.behaviorRepository = AppDataSource.getRepository(UserBehavior);
    this.preferenceRepository = AppDataSource.getRepository(UserPreference);
    this.productLikeRepository = AppDataSource.getRepository(ProductLike);
    this.productRepository = AppDataSource.getRepository(Product);
    this.categoryRepository = AppDataSource.getRepository(Category);
  }

  // Các trọng số mặc định cho các loại hành vi
  private behaviorWeights = {
    [BehaviorType.VIEW]: 0.5,
    [BehaviorType.LIKE]: 3.0,
    [BehaviorType.ADD_TO_CART]: 2.0,
    [BehaviorType.PURCHASE]: 5.0,
    [BehaviorType.REVIEW]: 4.0,
    [BehaviorType.SEARCH]: 0.3,
    [BehaviorType.CLICK_CATEGORY]: 0.3
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
      const behavior = await this.behaviorRepository.findOne({
        where: { userId, productId, behaviorType: BehaviorType.LIKE }
      });
      
      if (behavior) {
        await this.behaviorRepository.remove(behavior);
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
      const newBehavior = this.behaviorRepository.create({
        userId,
        productId,
        behaviorType: BehaviorType.REVIEW,
        data: reviewData,
        count: 1,
        weight: this.behaviorWeights[BehaviorType.REVIEW] || 1.0
      });
      
      const behavior = await this.behaviorRepository.save(newBehavior);
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
        await this.behaviorRepository.save(existingBehavior);
        return { success: true, behavior: existingBehavior };
      } else {
        // Tạo bản ghi mới
        const newBehavior = this.behaviorRepository.create({
          userId,
          productId: null,
          behaviorType: BehaviorType.SEARCH,
          data: JSON.stringify(searchData),
          count: 1,
          weight: searchWeight
        });
        
        const savedBehavior = await this.behaviorRepository.save(newBehavior);
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
    const baseWeight = this.behaviorWeights[BehaviorType.SEARCH] || 0.3;
    
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
    const behaviors = await this.behaviorRepository.find({
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
            await this.behaviorRepository.save(searchBehavior);
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
      const searchBehaviors = await this.behaviorRepository.find({
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
      const searchBehaviors = await this.behaviorRepository.find({
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
      // Đối với click_category, sử dụng phương thức riêng
      if (behaviorType === BehaviorType.CLICK_CATEGORY) {
        // Parse categoryId từ data
        try {
          const parsedData = JSON.parse(data);
          if (parsedData && parsedData.categoryId) {
            return this.trackCategoryClick(userId, parsedData.categoryId);
          }
        } catch (e) {
          console.error("Lỗi parse data:", e);
        }
      }
      
      // Tạo query để tìm kiếm behavior hiện có một cách chính xác hơn
      const whereCondition = {
        userId,
        behaviorType
      };
      
      // Chỉ thêm productId vào điều kiện nếu nó không phải null
      if (productId !== null) {
        Object.assign(whereCondition, { productId });
      } else {
        // Nếu productId null, chỉ tìm các bản ghi có productId = null
        Object.assign(whereCondition, { productId: IsNull() });
      }
      
      console.log(`Tìm kiếm behavior với điều kiện:`, whereCondition);
      
      let behavior = await this.behaviorRepository.findOne({
        where: whereCondition
      });
      
      if (behavior) {
        // Cập nhật hành vi đã tồn tại
        console.log(`Cập nhật behavior hiện có ID ${behavior.id} (count: ${behavior.count} -> ${behavior.count + 1})`);
        behavior.count += 1;
        behavior.data = data || behavior.data;
        await this.behaviorRepository.save(behavior);
      } else {
        // Tạo mới hành vi
        console.log(`Tạo mới behavior cho user ${userId}, product ${productId}, type ${behaviorType}`);
        const newBehavior = this.behaviorRepository.create({
          userId,
          productId,
          behaviorType,
          data,
          count: 1,
          weight: this.behaviorWeights[behaviorType] || 1.0
        });
        
        behavior = await this.behaviorRepository.save(newBehavior);
      }
      
      return { success: true, behavior };
    } catch (error) {
      console.error("Error tracking user behavior:", error);
      return { success: false, error: "Failed to track behavior" };
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
      let behavior = await this.behaviorRepository.findOne({
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
        await this.behaviorRepository.save(behavior);
      } else {
        // Tạo hành vi mới
        const newBehavior = this.behaviorRepository.create({
          userId,
          productId: null,
          behaviorType: BehaviorType.CLICK_CATEGORY,
          data,
          count: 1,
          weight: this.behaviorWeights[BehaviorType.CLICK_CATEGORY] || 0.3
        });
        
        behavior = await this.behaviorRepository.save(newBehavior);
      }
      
      return { success: true, behavior };
    } catch (error) {
      console.error("Error tracking category click:", error);
      return { success: false, error: "Failed to track category click" };
    }
  }
} 