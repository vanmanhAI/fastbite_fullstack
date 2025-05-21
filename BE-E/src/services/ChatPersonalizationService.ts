import { AppDataSource } from "../config/database";
import { UserBehavior, BehaviorType } from "../models/UserBehavior";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { User } from "../models/User";
import { ProductLike } from "../models/ProductLike";
import { extractKeywords } from "../utils/textProcessing";

/**
 * Service cá nhân hóa trò chuyện dựa trên hành vi người dùng
 */
export class ChatPersonalizationService {
  private readonly behaviorRepository = AppDataSource.getRepository(UserBehavior);
  private readonly productRepository = AppDataSource.getRepository(Product);
  private readonly categoryRepository = AppDataSource.getRepository(Category);
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly productLikeRepository = AppDataSource.getRepository(ProductLike);
  
  /**
   * Lấy dữ liệu cá nhân hóa cho chatbot
   * @param userId ID người dùng
   * @returns Dữ liệu cá nhân hóa để huấn luyện chatbot
   */
  async getPersonalizationData(userId: number) {
    try {
      // Lấy thông tin người dùng
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });
      
      if (!user) {
        return {
          success: false,
          message: "Không tìm thấy người dùng"
        };
      }
      
      // Dữ liệu tổng hợp
      const result: any = {
        userProfile: {
          name: user.name,
          email: user.email,
          registeredAt: user.createdAt,
          lastActivity: user.updatedAt
        },
        preferences: {},
        behaviors: {},
        insights: {}
      };
      
      // Sử dụng preferences từ user nếu có
      if (user.preferences) {
        result.preferences = user.preferences;
      }
      
      // Lấy và phân tích các hành vi tìm kiếm
      const searchBehaviors = await this.behaviorRepository.find({
        where: {
          userId,
          behaviorType: BehaviorType.SEARCH
        },
        order: { createdAt: "DESC" },
        take: 20
      });
      
      if (searchBehaviors.length > 0) {
        const searchQueries: string[] = [];
        const searchKeywords = new Set<string>();
        const searchIntents: any = {};
        
        searchBehaviors.forEach(behavior => {
          try {
            const data = JSON.parse(behavior.data);
            if (data.query) {
              searchQueries.push(data.query);
            }
            
            if (data.keywords && Array.isArray(data.keywords)) {
              data.keywords.forEach((kw: string) => searchKeywords.add(kw));
            }
            
            if (data.intent && data.intent.type) {
              searchIntents[data.intent.type] = (searchIntents[data.intent.type] || 0) + 1;
            }
          } catch (e) {
            // Xử lý lỗi parse
          }
        });
        
        result.behaviors.search = {
          recentQueries: searchQueries.slice(0, 5),
          frequency: searchBehaviors.length,
          popularKeywords: Array.from(searchKeywords).slice(0, 10),
          intents: searchIntents
        };
      }
      
      // Lấy và phân tích các sản phẩm đã xem
      const viewBehaviors = await this.behaviorRepository.find({
        where: {
          userId,
          behaviorType: BehaviorType.VIEW
        },
        order: { count: "DESC" },
        take: 20,
        relations: ["product"]
      });
      
      if (viewBehaviors.length > 0) {
        const viewedProducts = viewBehaviors
          .filter(b => b.product)
          .map(b => ({
            id: b.productId,
            name: b.product?.name || "Không xác định",
            count: b.count,
            lastViewed: b.createdAt
          }));
        
        result.behaviors.viewed = {
          products: viewedProducts.slice(0, 5),
          count: viewBehaviors.reduce((sum, b) => sum + b.count, 0),
          uniqueCount: viewBehaviors.length
        };
      }
      
      // Lấy các sản phẩm đã thích
      const likedProducts = await this.productLikeRepository.find({
        where: { userId },
        relations: ["product"],
        take: 10
      });
      
      if (likedProducts.length > 0) {
        result.behaviors.liked = {
          products: likedProducts.map(like => ({
            id: like.productId,
            name: like.product?.name || "Không xác định",
            likedAt: like.createdAt
          }))
        };
      }
      
      // Phân tích cụm từ khóa từ tất cả hành vi
      const allKeywords = new Set<string>();
      const allBehaviors = await this.behaviorRepository.find({
        where: { userId },
        take: 100
      });
      
      allBehaviors.forEach(behavior => {
        try {
          if (behavior.data) {
            // Trích xuất từ khóa từ dữ liệu hành vi
            const data = typeof behavior.data === 'string' 
              ? JSON.parse(behavior.data) 
              : behavior.data;
            
            // Từ khóa đã được trích xuất trước đó
            if (data.keywords && Array.isArray(data.keywords)) {
              data.keywords.forEach((kw: string) => allKeywords.add(kw));
            } 
            // Trích xuất từ khóa từ nội dung
            else if (data.query || data.content || data.text) {
              const text = data.query || data.content || data.text;
              const keywords = extractKeywords(text);
              keywords.forEach(kw => allKeywords.add(kw));
            }
          }
        } catch (e) {
          // Xử lý lỗi parse
        }
      });
      
      // Phân tích insights
      result.insights = {
        topInterests: Array.from(allKeywords).slice(0, 15),
        activityLevel: this.calculateActivityLevel(allBehaviors),
        preferredTimeOfDay: this.analyzeActivityTimes(allBehaviors),
        recommendationType: this.determineRecommendationTypeFromBehaviors(viewBehaviors, likedProducts)
      };
      
      return {
        success: true,
        personalization: result
      };
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu cá nhân hóa:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi khi lấy dữ liệu cá nhân hóa"
      };
    }
  }
  
  /**
   * Tính toán mức độ hoạt động của người dùng
   * @param behaviors Danh sách hành vi
   * @returns Mức độ hoạt động (low, medium, high)
   */
  private calculateActivityLevel(behaviors: UserBehavior[]): 'low' | 'medium' | 'high' {
    const totalCount = behaviors.reduce((sum, b) => sum + b.count, 0);
    const uniqueCount = behaviors.length;
    
    if (totalCount > 50 || uniqueCount > 20) return 'high';
    if (totalCount > 20 || uniqueCount > 10) return 'medium';
    return 'low';
  }
  
  /**
   * Phân tích thời gian hoạt động phổ biến
   * @param behaviors Danh sách hành vi
   * @returns Thời gian hoạt động phổ biến
   */
  private analyzeActivityTimes(behaviors: UserBehavior[]): 'morning' | 'afternoon' | 'evening' | 'varied' {
    const hourCounts = new Array(24).fill(0);
    
    // Đếm số lần hoạt động theo giờ
    behaviors.forEach(behavior => {
      const hour = new Date(behavior.createdAt).getHours();
      hourCounts[hour] += behavior.count;
    });
    
    // Phân chia thời gian
    const morning = hourCounts.slice(5, 12).reduce((sum, count) => sum + count, 0);
    const afternoon = hourCounts.slice(12, 18).reduce((sum, count) => sum + count, 0);
    const evening = hourCounts.slice(18, 24).reduce((sum, count) => sum + count, 0) + 
                    hourCounts.slice(0, 5).reduce((sum, count) => sum + count, 0);
    
    const total = morning + afternoon + evening;
    if (total === 0) return 'varied';
    
    const morningRatio = morning / total;
    const afternoonRatio = afternoon / total;
    const eveningRatio = evening / total;
    
    // Xác định thời gian phổ biến nhất
    if (morningRatio > 0.5) return 'morning';
    if (afternoonRatio > 0.5) return 'afternoon';
    if (eveningRatio > 0.5) return 'evening';
    
    return 'varied';
  }
  
  /**
   * Xác định loại đề xuất phù hợp nhất với người dùng
   * @param viewBehaviors Hành vi xem sản phẩm
   * @param likedProducts Sản phẩm đã thích
   * @returns Loại đề xuất phù hợp
   */
  private determineRecommendationTypeFromBehaviors(
    viewBehaviors: UserBehavior[],
    likedProducts: ProductLike[]
  ): 'category_based' | 'similarity_based' | 'popular' | 'hybrid' {
    // Nếu người dùng có nhiều hành vi xem sản phẩm
    if (viewBehaviors.length > 10 || likedProducts.length > 5) {
      return 'similarity_based';
    }

    // Nếu người dùng có hoạt động vừa phải
    if (viewBehaviors.length > 5 || likedProducts.length > 2) {
      return 'hybrid';
    }
    
    // Mặc định đề xuất theo sản phẩm phổ biến
    return 'popular';
  }
} 