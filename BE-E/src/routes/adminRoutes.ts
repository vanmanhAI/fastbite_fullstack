import express from "express";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { AdminOrderController } from "../controllers/AdminOrderController";

const router = express.Router();
const adminOrderController = new AdminOrderController();

// Middleware xác thực admin cho tất cả routes
router.use(authenticateToken, authorizeAdmin);

// Routes quản lý đơn hàng
router.get("/orders", adminOrderController.getAllOrders);
router.get("/orders/:id", adminOrderController.getOrderById);
router.post("/orders/:id/approve", adminOrderController.approveOrder);
router.post("/orders/:id/reject", adminOrderController.rejectOrder);
router.post("/orders/:id/ship", adminOrderController.shipOrder);
router.post("/orders/:id/delivered", adminOrderController.markAsDelivered);

export default router; 