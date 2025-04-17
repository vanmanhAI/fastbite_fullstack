import { body } from "express-validator";

export const createReviewValidator = [
  body("productId")
    .notEmpty().withMessage("ID sản phẩm không được để trống")
    .isInt().withMessage("ID sản phẩm phải là số nguyên"),
  
  body("rating")
    .notEmpty().withMessage("Điểm đánh giá không được để trống")
    .isInt({ min: 1, max: 5 }).withMessage("Điểm đánh giá phải từ 1 đến 5")
];

export const updateReviewValidator = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage("Điểm đánh giá phải từ 1 đến 5")
]; 