import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Order, OrderStatus } from "../models/Order";
import { Payment, PaymentMethod, PaymentStatus } from "../models/Payment";
import stripe from "../config/stripe";
import { Product } from "../models/Product";
import Stripe from "stripe";
const orderRepository = AppDataSource.getRepository(Order);
const paymentRepository = AppDataSource.getRepository(Payment);
const productRepository = AppDataSource.getRepository(Product);

// Tạo session thanh toán với Stripe
export const createStripeCheckoutSession = async (req: Request, res: Response) => {
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

    // Tạo danh sách line items cho Stripe
    const lineItems = await Promise.all(
      order.orderItems.map(async (item) => {
        const product = await productRepository.findOneBy({ id: item.productId });
        
        return {
          price_data: {
            currency: process.env.STRIPE_CURRENCY || 'vnd',
            product_data: {
              name: product?.name || `Sản phẩm #${item.productId}`,
              images: product?.imageUrl ? [product.imageUrl] : [],
              description: product?.description || '',
            },
            unit_amount: Math.round(Number(item.price)), // VND cũng cần được xử lý đúng theo quy định của Stripe
          },
          quantity: item.quantity,
        };
      })
    );
    
    // Nếu có giảm giá, thêm một line item mô tả khoản giảm giá
    if (order.discount && Number(order.discount) > 0) {
      lineItems.push({
        price_data: {
          currency: process.env.STRIPE_CURRENCY || 'vnd',
          product_data: {
            name: `Giảm giá${order.couponCode ? ` (${order.couponCode})` : ''}`,
            description: 'Giảm giá được áp dụng cho đơn hàng này',
            images: [] // Thêm images rỗng để đáp ứng yêu cầu
          },
          unit_amount: -Math.round(Number(order.discount)), // Âm để hiển thị là giảm giá
        },
        quantity: 1,
      });
    }

    // Tạo Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: order.id.toString(),
      customer_email: req.user.email,
      metadata: {
        orderId: order.id.toString(),
        userId: userId.toString()
      }
    });

    // Lưu thông tin thanh toán
    const payment = paymentRepository.create({
      orderId: order.id,
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.PENDING,
      amount: Number(order.totalAmount),
      stripeSessionId: session.id,
      notes: "Thanh toán qua Stripe"
    });

    await paymentRepository.save(payment);

    // Cập nhật đơn hàng
    order.paymentMethod = PaymentMethod.STRIPE;
    order.paymentStatus = PaymentStatus.PENDING;
    await orderRepository.save(order);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("Lỗi tạo phiên thanh toán Stripe:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo phiên thanh toán" });
  }
};

// Kiểm tra trạng thái thanh toán
export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Tìm thanh toán với session ID
    const payment = await paymentRepository.findOne({
      where: { stripeSessionId: sessionId },
      relations: ["order"]
    });

    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy thông tin thanh toán" });
    }

    // Kiểm tra trạng thái phiên thanh toán từ Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // Cập nhật trạng thái thanh toán
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentIntentId = session.payment_intent as string;
      await paymentRepository.save(payment);

      // Cập nhật trạng thái đơn hàng
      const order = payment.order;
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = OrderStatus.PROCESSING;
      await orderRepository.save(order);

      return res.status(200).json({
        success: true,
        message: "Thanh toán thành công",
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      });
    }

    return res.status(200).json({
      success: true,
      status: session.payment_status,
      payment: {
        id: payment.id,
        status: payment.status,
        orderId: payment.orderId
      }
    });
  } catch (error) {
    console.error("Lỗi kiểm tra trạng thái thanh toán:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi kiểm tra trạng thái thanh toán" });
  }
};

// Webhook xử lý sự kiện từ Stripe
export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ message: "Thiếu Stripe signature" });
  }

  try {
    // Xác thực webhook
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // Xử lý các sự kiện từ Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Cập nhật trạng thái thanh toán
        await handleSuccessfulPayment(session);
        break;
      
      case 'payment_intent.payment_failed':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Xử lý thanh toán thất bại
        await handleFailedPayment(paymentIntent);
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Lỗi xử lý webhook Stripe:', error);
    res.status(400).json({ message: 'Lỗi webhook' });
  }
};

// Xử lý thanh toán thành công
const handleSuccessfulPayment = async (session: Stripe.Checkout.Session) => {
  try {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    // Tìm thanh toán với session ID
    const payment = await paymentRepository.findOne({
      where: { stripeSessionId: session.id }
    });

    if (payment) {
      // Cập nhật trạng thái thanh toán
      payment.status = PaymentStatus.COMPLETED;
      payment.paymentIntentId = session.payment_intent as string;
      payment.transactionId = session.payment_intent as string;
      await paymentRepository.save(payment);

      // Cập nhật trạng thái đơn hàng
      const order = await orderRepository.findOneBy({ id: parseInt(orderId) });
      if (order) {
        order.paymentStatus = PaymentStatus.COMPLETED;
        order.status = OrderStatus.PROCESSING;
        await orderRepository.save(order);
      }
    }
  } catch (error) {
    console.error("Lỗi xử lý thanh toán thành công:", error);
  }
};

// Xử lý thanh toán thất bại
const handleFailedPayment = async (paymentIntent: Stripe.PaymentIntent) => {
  try {
    // Tìm thanh toán với payment intent ID
    const payment = await paymentRepository.findOne({
      where: { paymentIntentId: paymentIntent.id }
    });

    if (payment) {
      // Cập nhật trạng thái thanh toán
      payment.status = PaymentStatus.FAILED;
      payment.notes = `Thanh toán thất bại: ${paymentIntent.last_payment_error?.message || 'Lỗi không xác định'}`;
      await paymentRepository.save(payment);
    }
  } catch (error) {
    console.error("Lỗi xử lý thanh toán thất bại:", error);
  }
}; 