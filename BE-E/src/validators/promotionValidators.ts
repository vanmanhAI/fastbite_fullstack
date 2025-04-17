import { body } from "express-validator";
import { DiscountType } from "../models/Promotion";

export const createPromotionValidator = [
  body("name")
    .notEmpty().withMessage("Tên khuyến mãi không được để trống")
    .isLength({ min: 3, max: 100 }).withMessage("Tên khuyến mãi phải từ 3 đến 100 ký tự"),
  
  body("discountType")
    .notEmpty().withMessage("Loại giảm giá không được để trống")
    .isIn(Object.values(DiscountType)).withMessage("Loại giảm giá không hợp lệ"),
  
  body("discountValue")
    .notEmpty().withMessage("Giá trị giảm giá không được để trống")
    .isFloat({ min: 0 }).withMessage("Giá trị giảm giá phải lớn hơn hoặc bằng 0"),
  
  body("startDate")
    .notEmpty().withMessage("Ngày bắt đầu không được để trống")
    .isISO8601().withMessage("Ngày bắt đầu không hợp lệ"),
  
  body("endDate")
    .notEmpty().withMessage("Ngày kết thúc không được để trống")
    .isISO8601().withMessage("Ngày kết thúc không hợp lệ")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
      }
      return true;
    })
];

export const updatePromotionValidator = [
  body("name")
    .optional()
    .isLength({ min: 3, max: 100 }).withMessage("Tên khuyến mãi phải từ 3 đến 100 ký tự"),
  
  body("discountType")
    .optional()
    .isIn(Object.values(DiscountType)).withMessage("Loại giảm giá không hợp lệ"),
  
  body("discountValue")
    .optional()
    .isFloat({ min: 0 }).withMessage("Giá trị giảm giá phải lớn hơn hoặc bằng 0"),
  
  body("endDate")
    .optional()
    .isISO8601().withMessage("Ngày kết thúc không hợp lệ")
];

export const createCouponValidator = [
  body("promotionId")
    .notEmpty().withMessage("ID khuyến mãi không được để trống")
    .isInt().withMessage("ID khuyến mãi phải là số nguyên"),
  
  body("code")
    .notEmpty().withMessage("Mã giảm giá không được để trống")
    .isLength({ min: 3, max: 20 }).withMessage("Mã giảm giá phải từ 3 đến 20 ký tự")
    .matches(/^[A-Z0-9]*$/).withMessage("Mã giảm giá chỉ được chứa chữ hoa và số"),
  
  body("usageLimit")
    .optional()
    .isInt({ min: 1 }).withMessage("Giới hạn sử dụng phải là số nguyên lớn hơn 0")
]; 