import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validatePreferenceInput = [
  body('preferences')
    .isObject()
    .withMessage('Dữ liệu ưu tiên phải là đối tượng'),
  body('preferences.favoriteCategories')
    .optional()
    .isArray()
    .withMessage('Danh mục yêu thích phải là mảng'),
  body('preferences.dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Các hạn chế ăn uống phải là mảng'),
  body('preferences.tastePreferences')
    .optional()
    .isObject()
    .withMessage('Sở thích vị giác phải là đối tượng'),
  body('preferences.notificationSettings')
    .optional()
    .isObject()
    .withMessage('Cài đặt thông báo phải là đối tượng'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]; 