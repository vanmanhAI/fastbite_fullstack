import { body } from "express-validator";

export const createCategoryValidator = [
  body("name")
    .notEmpty().withMessage("Tên danh mục không được để trống")
    .isLength({ min: 2, max: 100 }).withMessage("Tên danh mục phải từ 2 đến 100 ký tự"),
  
  body("slug")
    .notEmpty().withMessage("Slug không được để trống")
    .isLength({ min: 2, max: 100 }).withMessage("Slug phải từ 2 đến 100 ký tự")
    .matches(/^[a-z0-9-]+$/).withMessage("Slug chỉ được chứa chữ thường, số và dấu gạch ngang")
];

export const updateCategoryValidator = [
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage("Tên danh mục phải từ 2 đến 100 ký tự"),
  
  body("slug")
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage("Slug phải từ 2 đến 100 ký tự")
    .matches(/^[a-z0-9-]+$/).withMessage("Slug chỉ được chứa chữ thường, số và dấu gạch ngang")
]; 