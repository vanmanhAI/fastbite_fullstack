import { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { momoConfig, createMomoSignature, verifyMomoSignature } from '../config/momo';
import { AppDataSource } from '../config/database';
import { Order, OrderStatus } from '../models/Order';
import { Payment, PaymentMethod, PaymentStatus } from '../models/Payment';

const orderRepository = AppDataSource.getRepository(Order);
const paymentRepository = AppDataSource.getRepository(Payment);

// Tạo giao dịch thanh toán qua MoMo
export const createMomoPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    // Tìm đơn hàng
    const order = await orderRepository.findOne({
      where: { id: parseInt(orderId), userId },
      relations: ["orderItems", "orderItems.product"]
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Kiểm tra xem đơn hàng đã thanh toán chưa
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      return res.status(400).json({ message: "Đơn hàng này đã được thanh toán" });
    }

    // Tạo dữ liệu yêu cầu thanh toán MoMo
    const requestId = uuidv4();
    const orderId2 = `${Date.now()}-${order.id}`;
    const amount = Math.round(Number(order.totalAmount));
    const orderInfo = `Thanh toan don hang #${order.id}`;
    
    const requestData = {
      partnerCode: momoConfig.partnerCode,
      accessKey: momoConfig.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderId2,
      orderInfo: orderInfo,
      redirectUrl: momoConfig.returnUrl,
      ipnUrl: momoConfig.notifyUrl,
      extraData: Buffer.from(JSON.stringify({ orderId: order.id })).toString('base64'),
      requestType: momoConfig.requestType
    };

    // Tạo chữ ký
    const signature = createMomoSignature(requestData);
    const fullRequestData = {
      ...requestData,
      signature: signature
    };

    // Gửi yêu cầu đến MoMo
    const response = await axios.post(momoConfig.endpoint, fullRequestData);
    const momoResponse = response.data;

    // Lưu thông tin thanh toán
    const payment = paymentRepository.create({
      orderId: order.id,
      method: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      amount: amount,
      transactionId: orderId2,
      notes: "Thanh toán qua MoMo"
    });

    await paymentRepository.save(payment);

    // Cập nhật đơn hàng
    order.paymentMethod = PaymentMethod.MOMO;
    order.paymentStatus = PaymentStatus.PENDING;
    await orderRepository.save(order);

    // Trả về URL thanh toán
    return res.status(200).json({
      success: true,
      payUrl: momoResponse.payUrl
    });
  } catch (error) {
    console.error("Lỗi tạo thanh toán MoMo:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo thanh toán MoMo" });
  }
};

// Xử lý callback từ MoMo
export const handleMomoCallback = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Kiểm tra chữ ký
    if (!verifyMomoSignature(data, data.signature)) {
      return res.status(400).json({ message: "Chữ ký không hợp lệ" });
    }

    const { orderId, resultCode, amount, transId, extraData } = data;
    
    // Giải mã thông tin đơn hàng
    const extraDataDecoded = JSON.parse(Buffer.from(extraData, 'base64').toString());
    const originalOrderId = extraDataDecoded.orderId;

    // Tìm thanh toán
    const payment = await paymentRepository.findOne({
      where: { transactionId: orderId }
    });

    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy thông tin thanh toán" });
    }

    // Tìm đơn hàng
    const order = await orderRepository.findOne({
      where: { id: parseInt(originalOrderId) }
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Xử lý kết quả thanh toán
    if (resultCode === 0) {
      // Thanh toán thành công
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = transId.toString();
      await paymentRepository.save(payment);

      // Cập nhật đơn hàng
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = OrderStatus.APPROVED;
      await orderRepository.save(order);

      return res.status(200).json({ message: "Cập nhật thanh toán thành công" });
    } else {
      // Thanh toán thất bại
      payment.status = PaymentStatus.FAILED;
      payment.notes = `Thanh toán thất bại: ${resultCode}`;
      await paymentRepository.save(payment);

      return res.status(200).json({ message: "Thanh toán thất bại" });
    }
  } catch (error) {
    console.error("Lỗi xử lý callback MoMo:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý callback" });
  }
};

// Kiểm tra trạng thái thanh toán
export const checkMomoPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    // Tìm đơn hàng và thanh toán
    const order = await orderRepository.findOne({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const payment = await paymentRepository.findOne({
      where: { orderId: order.id, method: PaymentMethod.MOMO }
    });

    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy thông tin thanh toán" });
    }

    // Trả về trạng thái thanh toán
    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        orderId: payment.orderId,
        transactionId: payment.transactionId
      },
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    console.error("Lỗi kiểm tra trạng thái thanh toán MoMo:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi kiểm tra trạng thái thanh toán" });
  }
}; 