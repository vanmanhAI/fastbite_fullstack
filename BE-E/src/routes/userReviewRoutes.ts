import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/userReviewController';
import { validateReviewInput } from '../validators/reviewValidator';

const router = express.Router();

// Lấy đánh giá của người dùng hiện tại
router.get('/me', authenticateToken, getUserReviews);

// Tạo đánh giá mới
router.post('/', authenticateToken, validateReviewInput, createReview);

// Cập nhật đánh giá
router.patch('/:reviewId', authenticateToken, validateReviewInput, updateReview);

// Xóa đánh giá
router.delete('/:reviewId', authenticateToken, deleteReview);

export default router; 