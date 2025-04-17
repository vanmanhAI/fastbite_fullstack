import { body } from "express-validator";

export const createAddressValidator = [
  body("fullName")
    .notEmpty().withMessage("Họ tên không được để trống")
    .isLength({ min: 3, max: 100 }).withMessage("Họ tên phải từ 3 đến 100 ký tự"),
  
  body("phone")
    .notEmpty().withMessage("Số điện thoại không được để trống")
    .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/).withMessage("Số điện thoại không hợp lệ"),
  
  body("province")
    .notEmpty().withMessage("Tỉnh/Thành phố không được để trống"),
  
  body("district")
    .notEmpty().withMessage("Quận/Huyện không được để trống"),
  
  body("ward")
    .notEmpty().withMessage("Phường/Xã không được để trống"),
  
  body("streetAddress")
    .notEmpty().withMessage("Địa chỉ chi tiết không được để trống")
];

export const updateAddressValidator = [
  body("fullName")
    .optional()
    .isLength({ min: 3, max: 100 }).withMessage("Họ tên phải từ 3 đến 100 ký tự"),
  
  body("phone")
    .optional()
    .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/).withMessage("Số điện thoại không hợp lệ")
]; 