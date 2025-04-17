import express from "express";
import * as orderController from "../controllers/orderController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validationMiddleware";
import { createOrderValidator, updateOrderStatusValidator } from "../validators/orderValidators";

const router = express.Router();

router.get("/my-orders", authenticateToken, orderController.getUserOrders);
router.get("/:id", authenticateToken, orderController.getOrderById);
router.post("/", authenticateToken, validate(createOrderValidator), orderController.createOrder);
router.post("/:id/cancel", authenticateToken, orderController.cancelOrder);

router.get("/", authenticateToken, authorizeAdmin, orderController.getAllOrders);
router.put(
  "/:id/status",
  authenticateToken,
  authorizeAdmin,
  validate(updateOrderStatusValidator),
  orderController.updateOrderStatus
);

export default router; 