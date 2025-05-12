import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { User } from '../models/User';

// Lấy tất cả đánh giá của người dùng
export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const reviewRepository = AppDataSource.getRepository(Review);
    const reviews = await reviewRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' }
    });
    
    return res.status(200).json({ reviews });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({
      message: 'Không thể lấy đánh giá, vui lòng thử lại sau',
    });
  }
};

// Tạo đánh giá mới
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, rating, comment } = req.body;
    
    // Kiểm tra sản phẩm tồn tại
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: productId } });
    
    if (!product) {
      return res.status(404).json({
        message: 'Không tìm thấy sản phẩm'
      });
    }
    
    // Kiểm tra người dùng đã đánh giá sản phẩm này chưa
    const reviewRepository = AppDataSource.getRepository(Review);
    const existingReview = await reviewRepository.findOne({
      where: { userId, productId }
    });
    
    if (existingReview) {
      return res.status(400).json({
        message: 'Bạn đã đánh giá sản phẩm này rồi'
      });
    }
    
    // Tạo đánh giá mới
    const newReview = reviewRepository.create({
      userId,
      productId,
      rating,
      comment
    });
    
    await reviewRepository.save(newReview);
    
    // Cập nhật rating trung bình của sản phẩm
    const allReviews = await reviewRepository.find({
      where: { productId }
    });
    
    const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
    
    // Cập nhật thông tin rating và số lượng đánh giá
    product.rating = avgRating;
    product.numReviews = allReviews.length;
    await productRepository.save(product);
    
    return res.status(201).json({ review: newReview });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({
      message: 'Không thể tạo đánh giá, vui lòng thử lại sau',
    });
  }
};

// Cập nhật đánh giá
export const updateReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reviewId = parseInt(req.params.reviewId);
    const { rating, comment } = req.body;
    
    const reviewRepository = AppDataSource.getRepository(Review);
    const review = await reviewRepository.findOne({
      where: { id: reviewId }
    });
    
    if (!review) {
      return res.status(404).json({
        message: 'Không tìm thấy đánh giá'
      });
    }
    
    if (review.userId !== userId) {
      return res.status(403).json({
        message: 'Bạn không có quyền cập nhật đánh giá này'
      });
    }
    
    // Cập nhật đánh giá
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    
    await reviewRepository.save(review);
    
    // Cập nhật rating trung bình của sản phẩm
    const productId = review.productId;
    const allReviews = await reviewRepository.find({
      where: { productId }
    });
    
    const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: productId } });
    
    if (product) {
      // Cập nhật rating
      product.rating = avgRating;
      await productRepository.save(product);
    }
    
    return res.status(200).json({ review });
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({
      message: 'Không thể cập nhật đánh giá, vui lòng thử lại sau',
    });
  }
};

// Xóa đánh giá
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reviewId = parseInt(req.params.reviewId);
    
    const reviewRepository = AppDataSource.getRepository(Review);
    const review = await reviewRepository.findOne({
      where: { id: reviewId }
    });
    
    if (!review) {
      return res.status(404).json({
        message: 'Không tìm thấy đánh giá'
      });
    }
    
    if (review.userId !== userId) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa đánh giá này'
      });
    }
    
    // Lưu productId trước khi xóa
    const productId = review.productId;
    
    // Xóa đánh giá
    await reviewRepository.remove(review);
    
    // Cập nhật rating trung bình của sản phẩm
    const allReviews = await reviewRepository.find({
      where: { productId }
    });
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: productId } });
    
    if (product) {
      if (allReviews.length === 0) {
        // Nếu không còn đánh giá nào
        product.rating = 0;
        product.numReviews = 0;
      } else {
        // Cập nhật rating mới
        const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
        product.rating = totalRating / allReviews.length;
        product.numReviews = allReviews.length;
      }
      
      await productRepository.save(product);
    }
    
    return res.status(200).json({
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      message: 'Không thể xóa đánh giá, vui lòng thử lại sau',
    });
  }
}; 