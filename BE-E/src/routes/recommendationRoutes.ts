import { Router } from "express";
import { 
  getPersonalizedRecommendations, 
  trackProductView, 
  trackSearchQuery,
  getUserPreferences,
  updateUserPreferences,
  trackProductLike,
  trackAddToCart,
  trackCategoryClick,
  trackReview,
  getRecommendedProducts,
  getRecommendationsBySearch,
  getChatPersonalization,
  getSearchAnalytics,
  trackProductViewFromSearch
} from "../controllers/recommendationController";
import { authenticateToken, optionalAuthMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route GET /api/recommendations
 * @desc Lấy đề xuất sản phẩm cá nhân hóa
 */
router.get("/", optionalAuthMiddleware, getPersonalizedRecommendations);

/**
 * @route GET /api/recommendations/:userId
 * @desc Lấy đề xuất sản phẩm dựa trên hành vi người dùng
 */
router.get("/:userId", authenticateToken, getRecommendedProducts);

/**
 * @route GET /api/recommendations/:userId/search-based
 * @desc Lấy đề xuất sản phẩm dựa trên lịch sử tìm kiếm
 */
router.get("/:userId/search-based", authenticateToken, getRecommendationsBySearch);

/**
 * @route GET /api/recommendations/:userId/personalization
 * @desc Lấy dữ liệu cá nhân hóa cho chatbot
 */
router.get("/:userId/personalization", authenticateToken, getChatPersonalization);

/**
 * @route GET /api/recommendations/:userId/search-analytics
 * @desc Lấy phân tích hành vi tìm kiếm
 */
router.get("/:userId/search-analytics", authenticateToken, getSearchAnalytics);

/**
 * @route POST /api/recommendations/track-view
 * @desc Theo dõi lượt xem sản phẩm (API mới)
 */
router.post("/track-view", authenticateToken, trackProductView);

/**
 * @route POST /api/recommendations/track-search
 * @desc Theo dõi tìm kiếm của người dùng (API mới)
 */
router.post("/track-search", authenticateToken, trackSearchQuery);

/**
 * @route POST /api/recommendations/track-category
 * @desc Theo dõi click vào danh mục (API mới)
 */
router.post("/track-category", authenticateToken, trackCategoryClick);

/**
 * @route POST /api/recommendations/track-view-from-search
 * @desc Theo dõi lượt xem sản phẩm từ kết quả tìm kiếm (API mới)
 */
router.post("/track-view-from-search", authenticateToken, trackProductViewFromSearch);

/**
 * @route POST /api/recommendations/user-behavior/view
 * @desc Theo dõi lượt xem sản phẩm (API cũ)
 */
router.post("/user-behavior/view", authenticateToken, trackProductView);

/**
 * @route POST /api/recommendations/user-behavior/search
 * @desc Theo dõi tìm kiếm của người dùng (API cũ)
 */
router.post("/user-behavior/search", authenticateToken, trackSearchQuery);

/**
 * @route POST /api/recommendations/user-behavior/like
 * @desc Theo dõi lượt thích sản phẩm (API cũ)
 */
router.post("/user-behavior/like", authenticateToken, trackProductLike);

/**
 * @route POST /api/recommendations/user-behavior/add-to-cart
 * @desc Theo dõi thêm vào giỏ hàng (API cũ)
 */
router.post("/user-behavior/add-to-cart", authenticateToken, trackAddToCart);

/**
 * @route POST /api/recommendations/user-behavior/review
 * @desc Theo dõi đánh giá sản phẩm (API cũ)
 */
router.post("/user-behavior/review", authenticateToken, trackReview);

/**
 * @route POST /api/recommendations/user-behavior/category-click
 * @desc Theo dõi click vào danh mục (API cũ)
 */
router.post("/user-behavior/category-click", authenticateToken, trackCategoryClick);

/**
 * @route GET /api/recommendations/preferences
 * @desc Lấy thông tin sở thích người dùng
 */
router.get("/preferences", authenticateToken, getUserPreferences);

/**
 * @route POST /api/recommendations/preferences
 * @desc Cập nhật sở thích người dùng
 */
router.post("/preferences", authenticateToken, updateUserPreferences);

/**
 * @route POST /api/recommendations/track-add-to-cart
 * @desc Theo dõi thêm vào giỏ hàng (API mới)
 */
router.post("/track-add-to-cart", authenticateToken, trackAddToCart);

// Thêm alias mới cho các API hiện có để đảm bảo tương thích với frontend
router.post("/like", authenticateToken, trackProductLike);
router.post("/track-like", authenticateToken, trackProductLike);

export default router; 