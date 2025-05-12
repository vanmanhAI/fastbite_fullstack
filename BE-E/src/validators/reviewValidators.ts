import { body } from "express-validator";

export const createReviewValidator = [
  body("productId")
    .optional()
    .isInt().withMessage("ID sản phẩm phải là số nguyên"),
  
  body("rating")
    .notEmpty().withMessage("Điểm đánh giá không được để trống")
    .isInt({ min: 1, max: 5 }).withMessage("Điểm đánh giá phải từ 1 đến 5"),
    
  body("comment")
    .notEmpty().withMessage("Nội dung đánh giá không được để trống")
];

export const updateReviewValidator = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage("Điểm đánh giá phải từ 1 đến 5")
]; 