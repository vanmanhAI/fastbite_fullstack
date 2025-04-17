import express, { Router } from "express";
import * as categoryController from "../controllers/categoryController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validationMiddleware";
import { createCategoryValidator, updateCategoryValidator } from "../validators/categoryValidators";
import { upload } from "../middlewares/uploadMiddleware";

const router = Router();

// Routes công khai
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.get("/slug/:slug", categoryController.getCategoryBySlug);

// Routes cho admin
router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  upload.single("image"),
  validate(createCategoryValidator),
  categoryController.createCategory
);

router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  upload.single("image"),
  validate(updateCategoryValidator),
  categoryController.updateCategory
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  categoryController.deleteCategory
);

export default router; 