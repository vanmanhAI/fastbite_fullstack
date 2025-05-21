import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api-config';

// Chuyển đổi URL API sang URL server
const SERVER_URL = API_URL.replace('/api', '');

class SocketService {
  private socket: Socket | null = null;
  private connectPromise: Promise<Socket> | null = null;
  private handlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor() {
    // Chỉ kết nối ở môi trường client
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  /**
   * Kết nối với Socket.IO server
   */
  connect(): Promise<Socket> {
    // Không kết nối khi đang chạy trên server
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Không thể kết nối Socket.IO ở server side'));
    }

    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.socket = io(SERVER_URL, {
          withCredentials: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10,
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connected:', this.socket?.id);
          resolve(this.socket!);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          reject(error);
        });
      } catch (err) {
        console.error('Socket.IO initialization error:', err);
        reject(err);
      }
    });

    return this.connectPromise;
  }

  /**
   * Tham gia phòng sản phẩm để nhận cập nhật real-time
   */
  joinProductRoom(productId: number): void {
    if (!productId || isNaN(Number(productId))) {
      console.error('ProductID không hợp lệ:', productId);
      return;
    }
    
    this.connect().then(socket => {
      socket.emit('join-product', productId);
    }).catch(err => {
      console.error('Lỗi khi tham gia phòng sản phẩm:', err);
    });
  }

  /**
   * Rời phòng sản phẩm
   */
  leaveProductRoom(productId: number): void {
    if (!productId || isNaN(Number(productId))) {
      return;
    }
    
    if (this.socket?.connected) {
      this.socket.emit('leave-product', productId);
    }
  }

  /**
   * Đăng ký nhận sự kiện cập nhật đánh giá sản phẩm
   */
  onProductReviewUpdate(callback: (data: any) => void): () => void {
    return this.registerEventHandler('product-review-update', callback);
  }

  /**
   * Đăng ký nhận sự kiện cập nhật rating sản phẩm
   */
  onProductRatingUpdate(callback: (data: { rating: number, numReviews: number }) => void): () => void {
    return this.registerEventHandler('product-rating-update', callback);
  }

  /**
   * Đăng ký nhận sự kiện cập nhật like sản phẩm
   */
  onProductLikeUpdate(callback: (data: { isLiked: boolean, likeCount: number }) => void): () => void {
    return this.registerEventHandler('product-like-update', callback);
  }

  /**
   * Đăng ký handler cho một sự kiện
   */
  private registerEventHandler(event: string, callback: (...args: any[]) => void): () => void {
    this.connect().then(socket => {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, new Set());
        
        // Đăng ký handler tổng cho sự kiện này
        socket.on(event, (...args: any[]) => {
          const handlers = this.handlers.get(event);
          if (handlers) {
            handlers.forEach(handler => handler(...args));
          }
        });
      }

      // Thêm callback vào danh sách handlers
      const handlers = this.handlers.get(event)!;
      handlers.add(callback);
    });

    // Trả về hàm để hủy đăng ký
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(callback);
      }
    };
  }

  /**
   * Ngắt kết nối socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectPromise = null;
    }
  }
}

// Singleton instance
const socketService = new SocketService();
export default socketService; 