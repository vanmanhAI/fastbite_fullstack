import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Review } from "../models/Review";
import { Product } from "../models/Product";
import { Order, OrderStatus } from "../models/Order";

const reviewRepository = AppDataSource.getRepository(Review);
const productRepository = AppDataSource.getRepository(Product);
const orderRepository = AppDataSource.getRepository(Order);

// Lấy đánh giá theo sản phẩm
export const getReviewsByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const skip = (page - 1) * limit;
    
    const [reviews, total] = await reviewRepository.findAndCount({
      where: { productId: parseInt(productId) },
      relations: ["user"],
      order: { createdAt: "DESC" },
      skip,
      take: limit
    });
    
    return res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy đánh giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy đánh giá" });
  }
};

// Người dùng thêm đánh giá
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId, orderId, rating, comment } = req.body;
    
    // Kiểm tra sản phẩm tồn tại
    const product = await productRepository.findOneBy({ id: productId });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    
    // Nếu có orderId, kiểm tra người dùng đã mua sản phẩm này chưa
    if (orderId) {
      const order = await orderRepository.findOne({
        where: { id: orderId, userId, status: OrderStatus.DELIVERED },
        relations: ["orderItems"]
      });
      
      if (!order) {
        return res.status(400).json({ 
          message: "Bạn chỉ có thể đánh giá sản phẩm từ đơn hàng đã hoàn thành của mình" 
        });
      }
      
      // Kiểm tra sản phẩm có trong đơn hàng
      const orderItem = order.orderItems.find(item => item.productId === productId);
      if (!orderItem) {
        return res.status(400).json({ 
          message: "Sản phẩm này không có trong đơn hàng đã chọn" 
        });
      }
      
      // Kiểm tra đã đánh giá sản phẩm từ đơn hàng này chưa
      const existingReview = await reviewRepository.findOneBy({ userId, productId, orderId });
      if (existingReview) {
        return res.status(400).json({ 
          message: "Bạn đã đánh giá sản phẩm này từ đơn hàng này rồi" 
        });
      }
    }
    
    // Tạo đánh giá mới
    const newReview = reviewRepository.create({
      productId,
      userId,
      orderId: orderId || null,
      rating,
      comment
    });
    
    await reviewRepository.save(newReview);
    
    return res.status(201).json({
      message: "Đánh giá thành công",
      review: newReview
    });
  } catch (error) {
    console.error("Lỗi tạo đánh giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo đánh giá" });
  }
};

// Người dùng cập nhật đánh giá
export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;
    
    // Tìm đánh giá
    const review = await reviewRepository.findOneBy({ id: parseInt(id), userId });
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa" });
    }
    
    // Cập nhật thông tin
    review.rating = rating || review.rating;
    review.comment = comment !== undefined ? comment : review.comment;
    
    await reviewRepository.save(review);
    
    return res.status(200).json({
      message: "Cập nhật đánh giá thành công",
      review
    });
  } catch (error) {
    console.error("Lỗi cập nhật đánh giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật đánh giá" });
  }
};

// Người dùng xóa đánh giá
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";
    
    // Tìm đánh giá
    const review = await reviewRepository.findOneBy({ id: parseInt(id) });
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }
    
    // Kiểm tra quyền xóa
    if (!isAdmin && review.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này" });
    }
    
    // Xóa đánh giá
    await reviewRepository.remove(review);
    
    return res.status(200).json({ message: "Xóa đánh giá thành công" });
  } catch (error) {
    console.error("Lỗi xóa đánh giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa đánh giá" });
  }
};

// [Admin] Lấy tất cả đánh giá
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const [reviews, total] = await reviewRepository.findAndCount({
      relations: ["user", "product"],
      order: { createdAt: "DESC" },
      skip,
      take: limit
    });
    
    return res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy tất cả đánh giá:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy tất cả đánh giá" });
  }
}; 