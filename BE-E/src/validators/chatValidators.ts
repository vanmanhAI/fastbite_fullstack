import { body } from "express-validator";

export const sendMessageValidator = [
  body("message")
    .notEmpty().withMessage("Tin nhắn không được để trống")
    .isLength({ max: 1000 }).withMessage("Tin nhắn không được quá 1000 ký tự")
]; 