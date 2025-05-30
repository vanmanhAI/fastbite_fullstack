import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Review } from "../models/Review";
import { Product } from "../models/Product";
import { Order, OrderStatus } from "../models/Order";
import { emitProductReviewUpdate, emitProductRatingUpdate } from "../services/socketService";
import WebSocketService from "../services/WebSocketService";
import { UserBehaviorService } from "../services/UserBehaviorService";

const reviewRepository = AppDataSource.getRepository(Review);
const productRepository = AppDataSource.getRepository(Product);
const orderRepository = AppDataSource.getRepository(Order);
const userBehaviorService = new UserBehaviorService();

// Hàm cập nhật rating sản phẩm
async function updateProductRating(productId: number) {
  try {
    // Lấy tất cả đánh giá của sản phẩm
    const reviews = await reviewRepository.find({
      where: { productId }
    });
    
    // Tính rating trung bình
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    const formattedRating = parseFloat(averageRating.toFixed(1));
    
    // Cập nhật sản phẩm
    await productRepository.update(
      { id: productId },
      { 
        rating: formattedRating,
        numReviews: reviews.length
      }
    );
    
    // Phát sự kiện cập nhật rating qua WebSocket
    emitProductRatingUpdate(productId, formattedRating, reviews.length);
  } catch (error) {
    console.error("Lỗi cập nhật rating sản phẩm:", error);
  }
}

// Lấy đánh giá theo sản phẩm
export const getReviewsByProduct = async (req: Request, res: Response) => {
  try {
    // Lấy productId từ params, có thể là từ :id hoặc :productId
    const productId = req.params.productId || req.params.id;
    
    if (!productId) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const skip = (page - 1) * limit;
    
    // Kiểm tra xem sản phẩm có tồn tại không
    const product = await productRepository.findOneBy({ id: parseInt(productId) });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    
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
    // Lấy productId từ params hoặc từ body
    const productId = req.params.id ? parseInt(req.params.id) : req.body.productId;
    const { orderId, rating, comment } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ hoặc thiếu" });
    }
    
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
      const existingReview = await reviewRepository.findOne({
        where: { userId, productId, orderId }
      });
      
      if (existingReview) {
        return res.status(400).json({ 
          message: "Bạn đã đánh giá sản phẩm này từ đơn hàng này rồi" 
        });
      }
    } else {
      // Nếu không gắn với đơn hàng, kiểm tra đã đánh giá sản phẩm chưa
      const existingReview = await reviewRepository.findOne({
        where: { userId, productId }
      });
      
      // Xác định hành vi: true = cập nhật đánh giá cũ, false = cho phép đánh giá nhiều lần
      const shouldUpdateExisting = false; // Thay đổi thành true nếu muốn cập nhật đánh giá cũ
      
      if (existingReview && shouldUpdateExisting) {
        // Cập nhật đánh giá hiện có thay vì từ chối
        existingReview.rating = rating;
        existingReview.comment = comment;
        
        await reviewRepository.save(existingReview);
        
        // Cập nhật rating của sản phẩm
        await updateProductRating(productId);
        
        // Lưu hành vi đánh giá sản phẩm
        try {
          await userBehaviorService.trackReview(userId, productId, rating);
          console.log(`[UserBehavior] Đã cập nhật hành vi đánh giá: User ${userId}, Product ${productId}, Rating ${rating}`);
        } catch (error) {
          console.error("Lỗi khi lưu hành vi đánh giá:", error);
        }
        
        // Lấy dữ liệu đầy đủ với thông tin user
        const updatedReview = await reviewRepository.findOne({
          where: { id: existingReview.id },
          relations: ["user"]
        });
        
        // Phát sự kiện cập nhật đánh giá
        emitProductReviewUpdate(productId, {
          action: 'update',
          review: updatedReview
        });
        
        return res.status(200).json({
          message: "Đã cập nhật đánh giá của bạn",
          review: updatedReview,
          updated: true
        });
      } else if (existingReview && !shouldUpdateExisting) {
        // Mặc định cho phép đánh giá nhiều lần với cùng một sản phẩm
        // Tạo đánh giá mới
        const newReview = reviewRepository.create({
          productId,
          userId,
          orderId: null,
          rating,
          comment
        });
        
        await reviewRepository.save(newReview);
        
        // Lấy thông tin user để trả về đầy đủ
        const reviewWithUser = await reviewRepository.findOne({
          where: { id: newReview.id },
          relations: ["user"]
        });
        
        // Cập nhật rating của sản phẩm
        await updateProductRating(productId);
        
        // Lưu hành vi đánh giá sản phẩm
        try {
          await userBehaviorService.trackReview(userId, productId, rating);
          console.log(`[UserBehavior] Đã lưu hành vi đánh giá: User ${userId}, Product ${productId}, Rating ${rating}`);
        } catch (error) {
          console.error("Lỗi khi lưu hành vi đánh giá:", error);
        }
        
        // Phát sự kiện có đánh giá mới
        emitProductReviewUpdate(productId, {
          action: 'new',
          review: reviewWithUser
        });
        
        return res.status(201).json({
          message: "Đánh giá thành công",
          review: reviewWithUser
        });
      } else {
        // Chưa có đánh giá nào, tiếp tục tạo đánh giá mới
      }
    }
    
    // Tạo đánh giá mới
    const newReview = reviewRepository.create({
      productId,
      userId,
      orderId,
      rating,
      comment
    });
    
    await reviewRepository.save(newReview);
    
    // Lưu hành vi đánh giá sản phẩm
    try {
      await userBehaviorService.trackReview(userId, productId, rating);
      console.log(`[UserBehavior] Đã lưu hành vi đánh giá: User ${userId}, Product ${productId}, Rating ${rating}`);
    } catch (error) {
      console.error("Lỗi khi lưu hành vi đánh giá:", error);
    }
    
    // Lấy thông tin user để trả về đầy đủ
    const reviewWithUser = await reviewRepository.findOne({
      where: { id: newReview.id },
      relations: ["user"]
    });
    
    // Cập nhật rating của sản phẩm
    await updateProductRating(productId);
    
    // Phát sự kiện có đánh giá mới
    emitProductReviewUpdate(productId, {
      action: 'new',
      review: reviewWithUser
    });
    
    return res.status(201).json({
      message: "Đánh giá thành công",
      review: reviewWithUser
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
    
    // Cập nhật rating của sản phẩm
    await updateProductRating(review.productId);
    
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
    
    // Lưu productId trước khi xóa
    const productId = review.productId;
    
    // Xóa đánh giá
    await reviewRepository.remove(review);
    
    // Cập nhật rating của sản phẩm
    await updateProductRating(productId);
    
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