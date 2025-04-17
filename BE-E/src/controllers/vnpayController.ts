import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order, OrderStatus } from '../models/Order';
import { Payment, PaymentMethod, PaymentStatus } from '../models/Payment';
import { vnpayConfig, createVnpaySignature, verifyVnpaySignature } from '../config/vnpay';
import dayjs from 'dayjs';

const orderRepository = AppDataSource.getRepository(Order);
const paymentRepository = AppDataSource.getRepository(Payment);

// Tạo giao dịch thanh toán qua VNPay
export const createVnpayPayment = async (req: Request, res: Response) => {
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

    // Tạo dữ liệu cho VNPay
    const createDate = dayjs().format('YYYYMMDDHHmmss');
    const amount = Math.round(Number(order.totalAmount) * 100); // VNPay yêu cầu số tiền không có thập phân và nhân với 100
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const tmnCode = vnpayConfig.tmnCode;
    const vnpTxnRef = `${order.id}-${Date.now()}`;
    const orderInfo = `Thanh toán đơn hàng #${order.id}`;
    const orderType = 'billpayment';
    const locale = vnpayConfig.locale;
    const currCode = vnpayConfig.currCode;
    const returnUrl = vnpayConfig.returnUrl;

    // Tạo đối tượng chứa các tham số cho VNPay
    const vnpParams: Record<string, string> = {
      vnp_Version: vnpayConfig.version,
      vnp_Command: vnpayConfig.command,
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: vnpTxnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: amount.toString(),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr.toString(),
      vnp_CreateDate: createDate
    };

    // Tạo chữ ký
    const secureHash = createVnpaySignature(vnpParams);
    vnpParams['vnp_SecureHash'] = secureHash;

    // Tạo URL thanh toán
    const queryParams = new URLSearchParams();
    for (const key in vnpParams) {
      queryParams.append(key, vnpParams[key]);
    }

    const paymentUrl = `${vnpayConfig.vnpUrl}?${queryParams.toString()}`;

    // Lưu thông tin thanh toán
    const payment = paymentRepository.create({
      orderId: order.id,
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      amount: Number(order.totalAmount),
      transactionId: vnpTxnRef,
      notes: "Thanh toán qua VNPay"
    });

    await paymentRepository.save(payment);

    // Cập nhật đơn hàng
    order.paymentMethod = PaymentMethod.VNPAY;
    order.paymentStatus = PaymentStatus.PENDING;
    await orderRepository.save(order);

    // Trả về URL thanh toán
    return res.status(200).json({
      success: true,
      payUrl: paymentUrl
    });
  } catch (error) {
    console.error("Lỗi tạo thanh toán VNPay:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo thanh toán VNPay" });
  }
};

// Xử lý callback từ VNPay
export const handleVnpayReturn = async (req: Request, res: Response) => {
  try {
    const vnpParams: Record<string, string> = req.query as Record<string, string>;
    const secureHash = vnpParams['vnp_SecureHash'];

    if (!secureHash) {
      return res.status(400).json({ message: "Không tìm thấy chữ ký bảo mật" });
    }

    // Xác minh chữ ký từ VNPay
    if (!verifyVnpaySignature(vnpParams, secureHash)) {
      return res.status(400).json({ message: "Chữ ký không hợp lệ" });
    }

    const vnpTxnRef = vnpParams['vnp_TxnRef'];
    const vnpResponseCode = vnpParams['vnp_ResponseCode'];
    const vnpTransactionStatus = vnpParams['vnp_TransactionStatus'];

    // Tìm kiếm thông tin thanh toán
    const payment = await paymentRepository.findOne({
      where: { transactionId: vnpTxnRef }
    });

    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy thông tin thanh toán" });
    }

    // Tìm đơn hàng
    const order = await orderRepository.findOne({
      where: { id: payment.orderId }
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Xử lý kết quả thanh toán
    if (vnpResponseCode === '00' && vnpTransactionStatus === '00') {
      // Thanh toán thành công
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = vnpTxnRef;
      await paymentRepository.save(payment);

      // Cập nhật đơn hàng
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = OrderStatus.PROCESSING;
      await orderRepository.save(order);

      // Chuyển hướng về trang thành công
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?method=vnpay&orderId=${order.id}`);
    } else {
      // Thanh toán thất bại
      payment.status = PaymentStatus.FAILED;
      payment.notes = `Thanh toán thất bại: ${vnpResponseCode}`;
      await paymentRepository.save(payment);

      // Chuyển hướng về trang thất bại
      return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel?method=vnpay&orderId=${order.id}`);
    }
  } catch (error) {
    console.error("Lỗi xử lý callback VNPay:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý callback" });
  }
};

// Kiểm tra trạng thái thanh toán VNPay
export const checkVnpayPaymentStatus = async (req: Request, res: Response) => {
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
      where: { orderId: order.id, method: PaymentMethod.VNPAY }
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
    console.error("Lỗi kiểm tra trạng thái thanh toán VNPay:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi kiểm tra trạng thái thanh toán" });
  }
}; 