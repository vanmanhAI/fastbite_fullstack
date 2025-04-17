import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Order, OrderStatus, PaymentStatus } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Product } from "../models/Product";
import { InventoryTransaction, TransactionType } from "../models/InventoryTransaction";
import { Address } from "../models/Address";

const orderRepository = AppDataSource.getRepository(Order);
const orderItemRepository = AppDataSource.getRepository(OrderItem);
const productRepository = AppDataSource.getRepository(Product);
const inventoryRepository = AppDataSource.getRepository(InventoryTransaction);

// Lấy danh sách đơn hàng của người dùng hiện tại
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await orderRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip,
      take: limit,
      relations: ["orderItems", "orderItems.product"]
    });

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

// Lấy thông tin chi tiết đơn hàng
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Tạo query cơ bản
    const queryOptions: any = {
      where: { id: parseInt(id) },
      relations: ["orderItems", "orderItems.product", "reviews"]
    };

    // Nếu không phải admin, chỉ cho phép xem đơn hàng của chính mình
    if (!isAdmin) {
      queryOptions.where.userId = userId;
    }

    const order = await orderRepository.findOne(queryOptions);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Lỗi lấy thông tin đơn hàng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin đơn hàng" });
  }
};

// Tạo đơn hàng mới
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { items, paymentMethod, deliveryAddressId, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Danh sách sản phẩm không hợp lệ" });
    }

    // Kiểm tra và lấy thông tin địa chỉ giao hàng
    const addressRepository = AppDataSource.getRepository(Address);
    const deliveryAddress = await addressRepository.findOne({
      where: { id: deliveryAddressId, userId: userId }
    });

    if (!deliveryAddress) {
      return res.status(400).json({ message: "Địa chỉ giao hàng không hợp lệ" });
    }

    // Format địa chỉ giao hàng thành chuỗi
    const formattedAddress = `${deliveryAddress.fullName}, ${deliveryAddress.phone}, ${deliveryAddress.streetAddress}, ${deliveryAddress.ward}, ${deliveryAddress.district}, ${deliveryAddress.province}`;

    // Tính tổng tiền và kiểm tra tồn kho
    let totalAmount = 0;
    const orderItems = [];
    const productUpdates = [];
    const inventoryTransactions = [];

    for (const item of items) {
      const product = await productRepository.findOneBy({ id: item.productId });
      
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm với ID ${item.productId} không tồn tại` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Sản phẩm "${product.name}" không đủ số lượng. Hiện chỉ còn ${product.stock}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      });

      // Chuẩn bị cập nhật tồn kho
      product.stock -= item.quantity;
      productUpdates.push(product);

      // Chuẩn bị ghi nhận giao dịch kho
      inventoryTransactions.push({
        productId: product.id,
        quantity: item.quantity,
        type: TransactionType.OUT,
        referenceType: "order",
        notes: `Đơn hàng mới #`
      });
    }

    // Tạo đơn hàng
    const newOrder = orderRepository.create({
      userId,
      addressId: deliveryAddressId,
      totalAmount,
      subtotal: totalAmount,
      shippingFee: 0,
      discount: 0,
      paymentMethod,
      deliveryAddress: formattedAddress,
      notes,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING
    });

    await orderRepository.save(newOrder);

    // Lưu các mục đơn hàng
    for (const item of orderItems) {
      const orderItem = orderItemRepository.create({
        orderId: newOrder.id,
        ...item
      });
      await orderItemRepository.save(orderItem);
    }

    // Cập nhật tồn kho
    for (const product of productUpdates) {
      await productRepository.save(product);
    }

    // Ghi nhận giao dịch kho
    for (let i = 0; i < inventoryTransactions.length; i++) {
      const transaction = inventoryTransactions[i];
      transaction.referenceId = newOrder.id;
      transaction.notes += newOrder.id;

      const inventoryTransaction = inventoryRepository.create(transaction);
      await inventoryRepository.save(inventoryTransaction);
    }

    // Nếu thanh toán qua Stripe, trả về thông tin để tạo phiên thanh toán
    if (paymentMethod === "stripe") {
      return res.status(201).json({
        message: "Đặt hàng thành công, chuyển đến thanh toán",
        order: {
          ...newOrder,
          orderItems: await orderItemRepository.find({
            where: { orderId: newOrder.id },
            relations: ["product"]
          })
        },
        requiresPayment: true,
        paymentMethod: "stripe"
      });
    }

    // Trả về đơn hàng bình thường cho các phương thức thanh toán khác
    return res.status(201).json({
      message: "Đặt hàng thành công",
      order: {
        ...newOrder,
        orderItems: await orderItemRepository.find({
          where: { orderId: newOrder.id },
          relations: ["product"]
        })
      }
    });
  } catch (error) {
    console.error("Lỗi tạo đơn hàng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo đơn hàng" });
  }
};

// [Người dùng] Hủy đơn hàng
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Tìm đơn hàng
    const order = await orderRepository.findOne({
      where: { id: parseInt(id), userId },
      relations: ["orderItems"]
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Chỉ cho phép hủy đơn hàng ở trạng thái PENDING hoặc PROCESSING
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
      return res.status(400).json({ 
        message: "Không thể hủy đơn hàng này do đã hoàn thành hoặc đã hủy"
      });
    }

    // Cập nhật trạng thái đơn hàng
    order.status = OrderStatus.CANCELLED;
    await orderRepository.save(order);

    // Hoàn trả số lượng sản phẩm vào kho
    const orderItems = await orderItemRepository.find({
      where: { orderId: order.id },
      relations: ["product"]
    });

    for (const item of orderItems) {
      // Cập nhật số lượng sản phẩm
      const product = item.product;
      product.stock += item.quantity;
      await productRepository.save(product);

      // Ghi nhận giao dịch kho
      const inventoryTransaction = inventoryRepository.create({
        productId: product.id,
        quantity: item.quantity,
        type: TransactionType.IN,
        referenceId: order.id,
        referenceType: "order_cancel",
        notes: `Hủy đơn hàng #${order.id}`
      });
      await inventoryRepository.save(inventoryTransaction);
    }

    return res.status(200).json({
      message: "Hủy đơn hàng thành công",
      order
    });
  } catch (error) {
    console.error("Lỗi hủy đơn hàng:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi hủy đơn hàng" });
  }
};

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