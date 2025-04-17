import express from "express";
import * as promotionController from "../controllers/promotionController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validationMiddleware";
import { createPromotionValidator, updatePromotionValidator, createCouponValidator } from "../validators/promotionValidators";

const router = express.Router();

router.get("/active", promotionController.getActivePromotions);
router.post("/apply-coupon", authenticateToken, promotionController.applyCoupon);

router.get("/", authenticateToken, authorizeAdmin, promotionController.getAllPromotions);
router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  validate(createPromotionValidator),
  promotionController.createPromotion
);
router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  validate(updatePromotionValidator),
  promotionController.updatePromotion
);
router.delete("/:id", authenticateToken, authorizeAdmin, promotionController.deletePromotion);

// Routes cho mã giảm giá
router.post(
  "/coupons",
  authenticateToken,
  authorizeAdmin,
  validate(createCouponValidator),
  promotionController.createCoupon
);

export default router; 