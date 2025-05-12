import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateReviewInput = [
  body('productId')
    .notEmpty()
    .withMessage('ID sản phẩm không được để trống')
    .isInt()
    .withMessage('ID sản phẩm không hợp lệ'),
  body('rating')
    .notEmpty()
    .withMessage('Điểm đánh giá không được để trống')
    .isInt({ min: 1, max: 5 })
    .withMessage('Điểm đánh giá phải từ 1-5'),
  body('comment')
    .notEmpty()
    .withMessage('Nội dung đánh giá không được để trống')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Nội dung đánh giá phải có ít nhất 5 ký tự'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]; 