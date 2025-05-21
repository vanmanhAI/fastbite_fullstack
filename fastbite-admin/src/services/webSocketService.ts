import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'sonner';

export enum SocketEvents {
  // Sự kiện đơn hàng
  ORDER_CREATED = 'order:created',
  ORDER_APPROVED = 'order:approved',
  ORDER_REJECTED = 'order:rejected',
  ORDER_SHIPPED = 'order:shipped',
  ORDER_DELIVERED = 'order:delivered',
  ORDER_COMPLETED = 'order:completed',
  ORDER_CANCELLED = 'order:cancelled',
  
  // Sự kiện thanh toán
  PAYMENT_COMPLETED = 'payment:completed',
  PAYMENT_FAILED = 'payment:failed',
  PAYMENT_REFUNDED = 'payment:refunded',

  // Sự kiện chung
  NOTIFICATION = 'notification',
}

export interface Notification {
  type: string;
  message: string;
  data?: any;
}

export type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 3000; // 3 giây
  private autoReconnect: boolean = true;
  private serverUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  constructor() {
    // Khởi tạo service, nhưng không kết nối ngay
    this.eventListeners = new Map();
  }

  // Kết nối tới WebSocket server
  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket?.connected) {
          console.log('WebSocket already connected.');
          resolve(true);
          return;
        }
        
        const token = getAuthToken();
        if (!token) {
          console.error('Auth token not found, cannot connect to WebSocket.');
          reject(new Error('Auth token not found'));
          return;
        }

        // Kết nối vào namespace dành riêng cho admin
        this.socket = io(`${this.serverUrl}/admin`, {
          auth: { token },
          reconnection: false, // Tắt auto-reconnect mặc định, chúng ta sẽ tự xử lý
          transports: ['websocket']
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.socket.on('connect_error', (err) => {
          console.error('WebSocket connection error:', err);
          this.handleReconnect();
          reject(err);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          if (this.autoReconnect) {
            this.handleReconnect();
          }
        });

        // Xử lý sự kiện thông báo
        this.socket.on(SocketEvents.NOTIFICATION, (notification: Notification) => {
          console.log('Received notification:', notification);
          // Hiển thị toast thông báo
          toast(notification.message, {
            description: `Loại: ${notification.type}`,
            action: {
              label: 'Xem',
              onClick: () => {
                if (notification.type === 'order_update' && notification.data?.order?.id) {
                  window.location.href = `/dashboard/orders/${notification.data.order.id}`;
                }
              }
            }
          });
          
          // Gọi các callback đã đăng ký
          this.triggerEvent(SocketEvents.NOTIFICATION, notification);
        });

        // Đăng ký lắng nghe tất cả các sự kiện đơn hàng
        Object.values(SocketEvents).forEach(event => {
          if (event !== SocketEvents.NOTIFICATION) {
            this.socket?.on(event, (data) => {
              console.log(`Received event ${event}:`, data);
              this.triggerEvent(event, data);
            });
          }
        });
      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        reject(error);
      }
    });
  }

  // Ngắt kết nối
  disconnect() {
    if (this.socket) {
      this.autoReconnect = false; // Không tự động kết nối lại
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }

  // Xử lý kết nối lại
  private handleReconnect() {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Stopped reconnecting after ${this.reconnectAttempts} attempts.`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Xử lý lỗi im lặng vì handleReconnect sẽ được gọi lại từ connect_error
      });
    }, this.reconnectInterval);
  }

  // Đăng ký callback cho một sự kiện
  on(event: SocketEvents, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  // Hủy đăng ký callback cho một sự kiện
  off(event: SocketEvents, callback: EventCallback) {
    if (!this.eventListeners.has(event)) return;
    
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Kích hoạt tất cả callback cho một sự kiện
  private triggerEvent(event: string, data: any) {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event callback:`, error);
        }
      });
    }
  }
}

// Export một instance duy nhất
export const webSocketService = new WebSocketService(); 