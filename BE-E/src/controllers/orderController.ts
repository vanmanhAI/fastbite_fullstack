import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Order, OrderStatus, PaymentStatus } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Product } from "../models/Product";
import { InventoryTransaction, TransactionType } from "../models/InventoryTransaction";
import { Address } from "../models/Address";
import { OrderService } from "../services/OrderService";
import { HttpException } from "../utils/HttpException";

const orderRepository = AppDataSource.getRepository(Order);
const orderItemRepository = AppDataSource.getRepository(OrderItem);
const productRepository = AppDataSource.getRepository(Product);
const inventoryRepository = AppDataSource.getRepository(InventoryTransaction);

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService(AppDataSource);
  }

  // Lấy tất cả đơn hàng của người dùng
  getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const status = req.query.status as OrderStatus | undefined;

      const orders = await this.orderService.getUserOrders(userId, page, limit, status);
      
      res.status(200).json({
        success: true,
        ...orders
      });
    } catch (error) {
      next(error);
    }
  };

  // Lấy chi tiết đơn hàng
  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const orderId = parseInt(req.params.id);

      const order = await this.orderService.getOrderById(orderId, userId);
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  };

  // Tạo đơn hàng mới
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { shippingAddress, shippingPhone, note } = req.body;

      if (!shippingAddress || !shippingPhone) {
        throw new HttpException(400, "Địa chỉ và số điện thoại giao hàng là bắt buộc");
      }

      const order = await this.orderService.createOrder(
        userId,
        {
          shippingAddress,
          shippingPhone,
          note
        }
      );
      
      res.status(201).json({
        success: true,
        data: order,
        message: "Đặt hàng thành công"
      });
    } catch (error) {
      next(error);
    }
  };

  // Hủy đơn hàng
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const orderId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason) {
        throw new HttpException(400, "Vui lòng cung cấp lý do hủy đơn hàng");
      }

      const order = await this.orderService.cancelOrder(orderId, userId, reason);
      
      res.status(200).json({
        success: true,
        data: order,
        message: "Hủy đơn hàng thành công"
      });
    } catch (error) {
      next(error);
    }
  };

  // Xác nhận đã nhận hàng
  completeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const orderId = parseInt(req.params.id);

      const order = await this.orderService.completeOrder(orderId, userId);
      
      res.status(200).json({
        success: true,
        data: order,
        message: "Đã xác nhận nhận hàng thành công"
      });
    } catch (error) {
      next(error);
    }
  };
}

// [Admin] Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    // Tìm đơn hàng
    const order = await orderRepository.findOneBy({ id: parseInt(id) });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Cập nhật trạng thái
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      order.status = status as OrderStatus;
    }

    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      order.paymentStatus = paymentStatus as PaymentStatus;
    }

    // Lưu vào database
    await orderRepository.save(order);

    return res.status(200).json({
      message: "Cập nhật trạng thái đơn hàng thành công",
      order
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn hàng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật trạng thái" });
  }
};

// [Admin] Lấy tất cả đơn hàng
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const skip = (page - 1) * limit;
    
    let queryOptions: any = {
      order: { createdAt: "DESC" },
      skip,
      take: limit,
      relations: ["user"]
    };
    
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      queryOptions.where = { status };
    }
    
    const [orders, total] = await orderRepository.findAndCount(queryOptions);
    
    return res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách đơn hàng" });
  }
}; 