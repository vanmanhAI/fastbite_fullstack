import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

/**
 * Khởi tạo Socket.IO service
 * @param server HTTP server instance
 */
export const initSocketService = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:3001",
        process.env.FRONTEND_URL || "*"
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Người dùng đã kết nối:', socket.id);

    // Phòng cho từng sản phẩm
    socket.on('join-product', (productId) => {
      socket.join(`product:${productId}`);
      console.log(`Socket ${socket.id} đã tham gia phòng sản phẩm ${productId}`);
    });

    socket.on('leave-product', (productId) => {
      socket.leave(`product:${productId}`);
      console.log(`Socket ${socket.id} đã rời phòng sản phẩm ${productId}`);
    });

    socket.on('disconnect', () => {
      console.log('Người dùng đã ngắt kết nối:', socket.id);
    });
  });

  return io;
};

/**
 * Lấy instance Socket.IO service
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO chưa được khởi tạo. Hãy gọi initSocketService trước.');
  }
  return io;
};

/**
 * Gửi cập nhật đánh giá mới cho tất cả clients đang xem sản phẩm
 */
export const emitProductReviewUpdate = (productId: number, data: any) => {
  if (!io) return;

  io.to(`product:${productId}`).emit('product-review-update', data);
};

/**
 * Gửi cập nhật rating sản phẩm cho tất cả clients đang xem sản phẩm
 */
export const emitProductRatingUpdate = (productId: number, rating: number, numReviews: number) => {
  if (!io) return;

  io.to(`product:${productId}`).emit('product-rating-update', { rating, numReviews });
};

/**
 * Gửi cập nhật like sản phẩm cho tất cả clients đang xem sản phẩm
 */
export const emitProductLikeUpdate = (productId: number, data: { isLiked: boolean, likeCount: number }) => {
  if (!io) return;

  io.to(`product:${productId}`).emit('product-like-update', data);
}; 