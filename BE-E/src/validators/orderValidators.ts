import { body } from "express-validator";
import { OrderStatus, PaymentStatus } from "../models/Order";

export const createOrderValidator = [
  body("items")
    .isArray({ min: 1 }).withMessage("Đơn hàng phải có ít nhất một sản phẩm"),
  
  body("items.*.productId")
    .isInt().withMessage("ID sản phẩm phải là số nguyên"),
  
  body("items.*.quantity")
    .isInt({ min: 1 }).withMessage("Số lượng phải là số nguyên lớn hơn 0"),
  
  body("paymentMethod")
    .notEmpty().withMessage("Phương thức thanh toán không được để trống"),
  
  body("deliveryAddressId")
    .isInt().withMessage("ID địa chỉ giao hàng phải là số nguyên")
];

export const updateOrderStatusValidator = [
  body("status")
    .optional()
    .isIn(Object.values(OrderStatus)).withMessage("Trạng thái đơn hàng không hợp lệ"),
  
  body("paymentStatus")
    .optional()
    .isIn(Object.values(PaymentStatus)).withMessage("Trạng thái thanh toán không hợp lệ")
]; 