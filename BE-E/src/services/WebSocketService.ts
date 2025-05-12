import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export enum SocketEvent {
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

class WebSocketService {
  private io: Server | null = null;
  private adminNamespace: any;
  private clientNamespace: any;

  // Khởi tạo Socket.IO server
  init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // Trong production, nên giới hạn nguồn cụ thể
        methods: ['GET', 'POST']
      }
    });

    // Tạo namespace riêng cho admin
    this.adminNamespace = this.io.of('/admin');
    
    // Tạo namespace riêng cho khách hàng
    this.clientNamespace = this.io.of('/client');

    // Xác thực middleware cho admin namespace
    this.adminNamespace.use((socket: any, next: any) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'admin') {
          return next(new Error('Not authorized'));
        }
        socket.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    // Xác thực middleware cho client namespace
    this.clientNamespace.use((socket: any, next: any) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        socket.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    // Xử lý kết nối admin
    this.adminNamespace.on('connection', (socket: any) => {
      console.log(`Admin connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`Admin disconnected: ${socket.id}`);
      });
    });

    // Xử lý kết nối khách hàng
    this.clientNamespace.on('connection', (socket: any) => {
      console.log(`Client connected: ${socket.id}, User ID: ${socket.user.id}`);
      
      // Tham gia vào room riêng cho user
      socket.join(`user:${socket.user.id}`);

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    console.log('WebSocket service initialized');
  }

  // Gửi thông báo đến tất cả admin
  notifyAdmins(event: SocketEvent, data: any) {
    if (!this.adminNamespace) return;
    this.adminNamespace.emit(event, data);
  }

  // Gửi thông báo đến một khách hàng cụ thể
  notifyUser(userId: number, event: SocketEvent, data: any) {
    if (!this.clientNamespace) return;
    this.clientNamespace.to(`user:${userId}`).emit(event, data);
  }

  // Gửi thông báo đến tất cả khách hàng
  notifyAllUsers(event: SocketEvent, data: any) {
    if (!this.clientNamespace) return;
    this.clientNamespace.emit(event, data);
  }

  // Gửi thông báo cập nhật đơn hàng cho cả admin và khách hàng
  notifyOrderUpdate(order: any) {
    // Thông báo cho admin
    this.notifyAdmins(SocketEvent.NOTIFICATION, {
      type: 'order_update',
      message: `Đơn hàng #${order.id} đã chuyển sang trạng thái ${order.status}`,
      order
    });

    // Thông báo cho khách hàng
    this.notifyUser(order.userId, SocketEvent.NOTIFICATION, {
      type: 'order_update',
      message: `Đơn hàng #${order.id} đã chuyển sang trạng thái ${order.status}`,
      order
    });

    // Gửi thông báo chi tiết tùy theo trạng thái đơn hàng
    switch (order.status) {
      case 'approved':
        this.notifyAdmins(SocketEvent.ORDER_APPROVED, order);
        this.notifyUser(order.userId, SocketEvent.ORDER_APPROVED, order);
        break;
      case 'rejected':
        this.notifyAdmins(SocketEvent.ORDER_REJECTED, order);
        this.notifyUser(order.userId, SocketEvent.ORDER_REJECTED, order);
        break;
      case 'shipping':
        this.notifyAdmins(SocketEvent.ORDER_SHIPPED, order);
        this.notifyUser(order.userId, SocketEvent.ORDER_SHIPPED, order);
        break;
      case 'delivered':
        this.notifyAdmins(SocketEvent.ORDER_DELIVERED, order);
        this.notifyUser(order.userId, SocketEvent.ORDER_DELIVERED, order);
        break;
      case 'completed':
        this.notifyAdmins(SocketEvent.ORDER_COMPLETED, order);
        this.notifyUser(order.userId, SocketEvent.ORDER_COMPLETED, order);
        break;
      case 'cancelled':
        this.notifyAdmins(SocketEvent.ORDER_CANCELLED, order);
        this.notifyUser(order.userId, SocketEvent.ORDER_CANCELLED, order);
        break;
      default:
        break;
    }
  }
}

export default new WebSocketService(); 