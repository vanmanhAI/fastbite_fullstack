import express from 'express';
import * as authController from '../controllers/authController';
import * as recommendationController from '../controllers/recommendationController';
import { authenticateToken, optionalAuthMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// Recommendation routes
// Hành vi người dùng
router.post('/recommendations/track-view', authenticateToken, recommendationController.trackProductView);
router.post('/recommendations/track-search', authenticateToken, recommendationController.trackSearchQuery);
router.post('/recommendations/track-category', authenticateToken, recommendationController.trackCategoryClick);
router.post('/recommendations/track-view-from-search', authenticateToken, recommendationController.trackProductViewFromSearch);
router.post('/recommendations/track-like', authenticateToken, recommendationController.trackProductLike);
router.get('/recommendations/:userId', authenticateToken, recommendationController.getRecommendedProducts);
router.get('/recommendations/:userId/search-based', authenticateToken, recommendationController.getRecommendationsBySearch);
router.get('/recommendations/:userId/personalization', authenticateToken, recommendationController.getChatPersonalization);

// Hành vi người dùng - các API cũ
router.post('/recommendations/user-behavior/like', authenticateToken, recommendationController.trackProductLike);
router.post('/recommendations/user-behavior/view', authenticateToken, recommendationController.trackProductView);
router.post('/recommendations/user-behavior/search', authenticateToken, recommendationController.trackSearchQuery);
router.post('/recommendations/user-behavior/add-to-cart', authenticateToken, recommendationController.trackAddToCart);
router.post('/recommendations/user-behavior/review', authenticateToken, recommendationController.trackReview);
router.post('/recommendations/user-behavior/category-click', authenticateToken, recommendationController.trackCategoryClick);

export default router; 