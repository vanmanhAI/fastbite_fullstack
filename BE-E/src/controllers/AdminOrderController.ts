import { Request, Response, NextFunction } from "express";
import { OrderService } from "../services/OrderService";
import { AppDataSource } from "../config/database";
import { HttpException } from "../utils/HttpException";
import { OrderStatus } from "../models/Order";

export class AdminOrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService(AppDataSource);
  }

  // Lấy tất cả đơn hàng (admin)
  getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const status = req.query.status as OrderStatus | undefined;

      const orders = await this.orderService.getAllOrders(page, limit, status);
      
      res.status(200).json({
        success: true,
        ...orders
      });
    } catch (error) {
      next(error);
    }
  };

  // Lấy chi tiết đơn hàng (admin)
  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = parseInt(req.params.id);

      const order = await this.orderService.getOrderById(orderId);
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  };

  // Phê duyệt đơn hàng (admin)
  approveOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user.id;
      const orderId = parseInt(req.params.id);

      const order = await this.orderService.approveOrder(orderId, adminId);
      
      res.status(200).json({
        success: true,
        data: order,
        message: "Đơn hàng đã được phê duyệt"
      });
    } catch (error) {
      next(error);
    }
  };

  // Từ chối đơn hàng (admin)
  rejectOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user.id;
      const orderId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason) {
        throw new HttpException(400, "Vui lòng cung cấp lý do từ chối đơn hàng");
      }

      const order = await this.orderService.rejectOrder(orderId, adminId, reason);
      
      res.status(200).json({
        success: true,
        data: order,
        message: "Đơn hàng đã bị từ chối"
      });
    } catch (error) {
      next(error);
    }
  };

  // Chuyển sang trạng thái đang giao hàng (admin)
  shipOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user.id;
      const orderId = parseInt(req.params.id);

      const order = await this.orderService.shipOrder(orderId, adminId);
      
      res.status(200).json({
        success: true,
        data: order,
        message: "Đơn hàng đã chuyển sang trạng thái đang giao"
      });
    } catch (error) {
      next(error);
    }
  };

  // Xác nhận đã giao hàng (admin)
  markAsDelivered = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user.id;
      const orderId = parseInt(req.params.id);

      const order = await this.orderService.markAsDelivered(orderId, adminId);
      
      res.status(200).json({
        success: true,
        data: order,
        message: "Đơn hàng đã được đánh dấu là đã giao"
      });
    } catch (error) {
      next(error);
    }
  };
} 