import { body } from "express-validator";

export const registerValidator = [
  body("name")
    .notEmpty().withMessage("Tên không được để trống")
    .isLength({ min: 3, max: 100 }).withMessage("Tên phải từ 3 đến 100 ký tự"),
  
  body("email")
    .notEmpty().withMessage("Email không được để trống")
    .isEmail().withMessage("Email không hợp lệ"),
  
  body("password")
    .notEmpty().withMessage("Mật khẩu không được để trống")
    .isLength({ min: 6 }).withMessage("Mật khẩu phải ít nhất 6 ký tự")
];

export const loginValidator = [
  body("email")
    .notEmpty().withMessage("Email không được để trống")
    .isEmail().withMessage("Email không hợp lệ"),
  
  body("password")
    .notEmpty().withMessage("Mật khẩu không được để trống")
];

export const updateUserValidator = [
  body("name")
    .notEmpty().withMessage("Tên không được để trống")
    .isLength({ min: 3, max: 100 }).withMessage("Tên phải từ 3 đến 100 ký tự")
];

export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty().withMessage("Mật khẩu hiện tại không được để trống"),
  
  body("newPassword")
    .notEmpty().withMessage("Mật khẩu mới không được để trống")
    .isLength({ min: 6 }).withMessage("Mật khẩu mới phải ít nhất 6 ký tự")
]; 