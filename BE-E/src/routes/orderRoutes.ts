import { Router } from "express";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { OrderController, getAllOrders, updateOrderStatus } from "../controllers/OrderController";
import { validate } from "../middlewares/validationMiddleware";
import { createOrderValidator } from "../validators/orderValidators";

const router = Router();
const orderController = new OrderController();

// Routes for authenticated users
router.use(authenticateToken);

// Get all orders of the authenticated user
router.get("/", orderController.getUserOrders);

// Get a specific order
router.get("/:id", orderController.getOrderById);

// Create a new order
router.post("/", validate(createOrderValidator), orderController.createOrder);

// Cancel an order
router.post("/:id/cancel", orderController.cancelOrder);

// Complete an order (confirm receipt)
router.post("/:id/complete", orderController.completeOrder);

// Admin routes
router.get("/admin/all", authorizeAdmin, getAllOrders);
router.put("/admin/:id/status", authorizeAdmin, updateOrderStatus);

export default router; 