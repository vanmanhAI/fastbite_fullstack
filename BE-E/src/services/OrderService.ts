import { DataSource } from "typeorm";
import { Order, OrderStatus, PaymentStatus } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Product } from "../models/Product";
import { Cart } from "../models/Cart";
import { Payment } from "../models/Payment";
import { HttpException } from "../utils/HttpException";
import WebSocketService, { SocketEvent } from "./WebSocketService";
import { UserBehaviorService } from "./UserBehaviorService";

export class OrderService {
  private orderRepository;
  private orderItemRepository;
  private productRepository;
  private cartRepository;
  private paymentRepository;
  private userBehaviorService;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.orderRepository = this.dataSource.getRepository(Order);
    this.orderItemRepository = this.dataSource.getRepository(OrderItem);
    this.productRepository = this.dataSource.getRepository(Product);
    this.cartRepository = this.dataSource.getRepository(Cart);
    this.paymentRepository = this.dataSource.getRepository(Payment);
    this.userBehaviorService = new UserBehaviorService();
  }

  // Lấy tất cả đơn hàng (admin)
  async getAllOrders(
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus
  ) {
    const query = this.orderRepository.createQueryBuilder("order")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.orderItems", "orderItems")
      .leftJoinAndSelect("orderItems.product", "product")
      .leftJoinAndSelect("order.payments", "payment")
      .orderBy("order.createdAt", "DESC");

    if (status) {
      query.where("order.status = :status", { status });
    }

    const [orders, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders,
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Lấy đơn hàng của người dùng
  async getUserOrders(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus
  ) {
    const query = this.orderRepository.createQueryBuilder("order")
      .where("order.userId = :userId", { userId })
      .leftJoinAndSelect("order.orderItems", "orderItems")
      .leftJoinAndSelect("orderItems.product", "product")
      .leftJoinAndSelect("order.payments", "payment")
      .orderBy("order.createdAt", "DESC");

    if (status) {
      query.andWhere("order.status = :status", { status });
    }

    const [orders, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders,
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Lấy chi tiết đơn hàng
  async getOrderById(orderId: number, userId?: number) {
    const query = this.orderRepository.createQueryBuilder("order")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.orderItems", "orderItems")
      .leftJoinAndSelect("orderItems.product", "product")
      .leftJoinAndSelect("order.payments", "payment")
      .where("order.id = :orderId", { orderId });

    if (userId) {
      query.andWhere("order.userId = :userId", { userId });
    }

    const order = await query.getOne();

    if (!order) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    return order;
  }

  // Tạo đơn hàng mới
  async createOrder(
    userId: number,
    orderData: {
      shippingAddress: string;
      shippingPhone: string;
      note?: string;
    }
  ) {
    // Sử dụng transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lấy giỏ hàng của người dùng
      const cartItems = await this.cartRepository.find({
        where: { userId },
        relations: ["product"]
      });

      if (!cartItems.length) {
        throw new HttpException(400, "Giỏ hàng trống");
      }

      // Kiểm tra số lượng tồn kho
      for (const item of cartItems) {
        if (item.quantity > item.product.stock) {
          throw new HttpException(400, `Sản phẩm "${item.product.name}" chỉ còn ${item.product.stock} trong kho`);
        }
      }

      // Tính tổng tiền
      const totalAmount = cartItems.reduce((total, item) => {
        return total + item.quantity * item.product.price;
      }, 0);

      // Tạo đơn hàng mới
      const newOrder = this.orderRepository.create({
        userId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        totalAmount,
        shippingAddress: orderData.shippingAddress,
        shippingPhone: orderData.shippingPhone,
        note: orderData.note
      });

      const savedOrder = await this.orderRepository.save(newOrder);

      // Tạo chi tiết đơn hàng
      const orderItems = cartItems.map(item => {
        return this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price
        });
      });

      await this.orderItemRepository.save(orderItems);

      // Cập nhật số lượng tồn kho
      for (const item of cartItems) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId }
        });
        
        if (product) {
          product.stock -= item.quantity;
          await this.productRepository.save(product);
        }
      }

      // Xóa giỏ hàng sau khi đặt hàng
      await this.cartRepository.delete({ userId });

      await queryRunner.commitTransaction();

      // Lưu hành vi mua hàng
      try {
        for (const item of cartItems) {
          await this.userBehaviorService.trackPurchase(userId, item.productId);
          console.log(`[UserBehavior] Đã lưu hành vi mua hàng: User ${userId}, Product ${item.productId}, Quantity ${item.quantity}`);
        }
      } catch (error) {
        console.error("Lỗi khi lưu hành vi mua hàng:", error);
        // Không ném lỗi để không ảnh hưởng đến luồng chính
      }

      // Thông báo real-time cho admin về đơn hàng mới
      const completeOrder = await this.getOrderById(savedOrder.id);
      WebSocketService.notifyAdmins(SocketEvent.ORDER_CREATED, completeOrder);
      WebSocketService.notifyAdmins(SocketEvent.NOTIFICATION, {
        type: 'new_order',
        message: `Có đơn hàng mới #${completeOrder.id} từ ${completeOrder.user.name}`,
        order: completeOrder
      });

      return completeOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Phê duyệt đơn hàng (admin)
  async approveOrder(orderId: number, adminId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["user"]
    });

    if (!order) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new HttpException(400, "Chỉ có thể phê duyệt đơn hàng đang ở trạng thái chờ xử lý");
    }

    order.status = OrderStatus.APPROVED;
    order.approvedAt = new Date();
    const updatedOrder = await this.orderRepository.save(order);

    // Thông báo real-time
    const completeOrder = await this.getOrderById(orderId);
    WebSocketService.notifyOrderUpdate(completeOrder);

    return completeOrder;
  }

  // Từ chối đơn hàng (admin)
  async rejectOrder(orderId: number, adminId: number, reason: string) {
    const order = await this.getOrderById(orderId);

    if (!order) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new HttpException(400, "Chỉ có thể từ chối đơn hàng đang ở trạng thái chờ xử lý");
    }

    // Hoàn trả số lượng sản phẩm vào kho
    for (const item of order.orderItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId }
      });
      
      if (product) {
        product.stock += item.quantity;
        await this.productRepository.save(product);
      }
    }

    order.status = OrderStatus.REJECTED;
    order.cancelReason = reason;
    const updatedOrder = await this.orderRepository.save(order);

    // Thông báo real-time
    const completeOrder = await this.getOrderById(orderId);
    WebSocketService.notifyOrderUpdate(completeOrder);

    return completeOrder;
  }

  // Chuyển đơn hàng sang trạng thái đang giao (admin)
  async shipOrder(orderId: number, adminId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["user"]
    });

    if (!order) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    if (order.status !== OrderStatus.APPROVED) {
      throw new HttpException(400, "Chỉ có thể chuyển sang trạng thái đang giao khi đơn hàng đã được phê duyệt");
    }

    order.status = OrderStatus.SHIPPING;
    order.shippedAt = new Date();
    const updatedOrder = await this.orderRepository.save(order);

    // Thông báo real-time
    const completeOrder = await this.getOrderById(orderId);
    WebSocketService.notifyOrderUpdate(completeOrder);

    return completeOrder;
  }

  // Xác nhận đã giao hàng (admin)
  async markAsDelivered(orderId: number, adminId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["user"]
    });

    if (!order) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    if (order.status !== OrderStatus.SHIPPING) {
      throw new HttpException(400, "Chỉ có thể chuyển sang trạng thái đã giao khi đơn hàng đang vận chuyển");
    }

    order.status = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    const updatedOrder = await this.orderRepository.save(order);

    // Thông báo real-time
    const completeOrder = await this.getOrderById(orderId);
    WebSocketService.notifyOrderUpdate(completeOrder);

    return completeOrder;
  }

  // Khách hàng xác nhận đã nhận hàng
  async completeOrder(orderId: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new HttpException(400, "Chỉ có thể hoàn tất đơn hàng khi đã giao hàng");
    }

    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();
    const updatedOrder = await this.orderRepository.save(order);

    // Thông báo real-time
    const completeOrder = await this.getOrderById(orderId);
    WebSocketService.notifyOrderUpdate(completeOrder);

    return completeOrder;
  }

  // Hủy đơn hàng (khách hàng)
  async cancelOrder(orderId: number, userId: number, reason: string) {
    const order = await this.getOrderById(orderId);

    if (!order || order.userId !== userId) {
      throw new HttpException(404, "Đơn hàng không tồn tại");
    }

    if (![OrderStatus.PENDING, OrderStatus.APPROVED].includes(order.status)) {
      throw new HttpException(400, "Chỉ có thể hủy đơn hàng khi đang ở trạng thái chờ xử lý hoặc đã phê duyệt");
    }

    // Hoàn trả số lượng sản phẩm vào kho
    for (const item of order.orderItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId }
      });
      
      if (product) {
        product.stock += item.quantity;
        await this.productRepository.save(product);
      }
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = reason;
    const updatedOrder = await this.orderRepository.save(order);

    // Thông báo real-time
    const completeOrder = await this.getOrderById(orderId);
    WebSocketService.notifyOrderUpdate(completeOrder);

    return completeOrder;
  }
} 