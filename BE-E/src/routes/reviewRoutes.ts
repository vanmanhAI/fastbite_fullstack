import express from "express";
import * as reviewController from "../controllers/reviewController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validationMiddleware";
import { createReviewValidator, updateReviewValidator } from "../validators/reviewValidators";

const router = express.Router();

router.get("/product/:productId", reviewController.getReviewsByProduct);
router.post(
  "/",
  authenticateToken,
  validate(createReviewValidator),
  reviewController.createReview
);
router.put(
  "/:id",
  authenticateToken,
  validate(updateReviewValidator),
  reviewController.updateReview
);
router.delete("/:id", authenticateToken, reviewController.deleteReview);

router.get("/", authenticateToken, authorizeAdmin, reviewController.getAllReviews);

export default router; 