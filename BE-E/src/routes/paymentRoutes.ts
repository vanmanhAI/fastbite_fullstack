import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { 
  createStripeCheckoutSession, 
  checkPaymentStatus, 
  stripeWebhook 
} from "../controllers/paymentController";
import {
  createMomoPayment,
  checkMomoPaymentStatus,
  handleMomoCallback
} from "../controllers/momoController";
import {
  createVnpayPayment,
  checkVnpayPaymentStatus,
  handleVnpayReturn
} from "../controllers/vnpayController";

const router = express.Router();

// Stripe routes
router.post("/stripe/create-checkout-session", authenticateToken, createStripeCheckoutSession);
router.post("/stripe/webhook", express.raw({ type: 'application/json' }), stripeWebhook);
router.get("/stripe/check-status/:sessionId", authenticateToken, checkPaymentStatus);

// MoMo routes
router.post("/momo/create-payment", authenticateToken, createMomoPayment);
router.post("/momo/ipn", handleMomoCallback);
router.get("/momo/check-status/:orderId", authenticateToken, checkMomoPaymentStatus);

// VNPay routes
router.post("/vnpay/create-payment", authenticateToken, createVnpayPayment);
router.get("/vnpay/return", handleVnpayReturn);
router.get("/vnpay/check-status/:orderId", authenticateToken, checkVnpayPaymentStatus);

export default router; 