import { body } from "express-validator";

export const createProductValidator = [
  body("name")
    .notEmpty().withMessage("Tên sản phẩm không được để trống")
    .isLength({ min: 3, max: 100 }).withMessage("Tên sản phẩm phải từ 3 đến 100 ký tự"),
  
  body("price")
    .notEmpty().withMessage("Giá không được để trống")
    .isNumeric().withMessage("Giá phải là số")
    .isFloat({ min: 0 }).withMessage("Giá phải lớn hơn hoặc bằng 0"),
  
  body("category")
    .notEmpty().withMessage("Loại sản phẩm không được để trống")
    .isIn(["food", "drink", "combo"]).withMessage("Loại sản phẩm không hợp lệ"),
  
  body("stock")
    .optional()
    .isInt({ min: 0 }).withMessage("Số lượng phải là số nguyên không âm"),
  
  body("preparationTime")
    .optional()
    .isInt({ min: 0 }).withMessage("Thời gian chuẩn bị phải là số nguyên không âm"),
  
  body("calories")
    .optional()
    .isInt({ min: 0 }).withMessage("Lượng calo phải là số nguyên không âm"),
  
  body("isVegetarian")
    .optional()
    .isBoolean().withMessage("Giá trị phải là true hoặc false"),
  
  body("isFeatured")
    .optional()
    .isBoolean().withMessage("Giá trị phải là true hoặc false")
];

export const updateProductValidator = [
  body("name")
    .optional()
    .isLength({ min: 3, max: 100 }).withMessage("Tên sản phẩm phải từ 3 đến 100 ký tự"),
  
  body("price")
    .optional()
    .isNumeric().withMessage("Giá phải là số")
    .isFloat({ min: 0 }).withMessage("Giá phải lớn hơn hoặc bằng 0"),
  
  body("category")
    .optional()
    .isIn(["food", "drink", "combo"]).withMessage("Loại sản phẩm không hợp lệ"),
  
  body("stock")
    .optional()
    .isInt({ min: 0 }).withMessage("Số lượng phải là số nguyên không âm"),
  
  body("preparationTime")
    .optional()
    .isInt({ min: 0 }).withMessage("Thời gian chuẩn bị phải là số nguyên không âm"),
  
  body("calories")
    .optional()
    .isInt({ min: 0 }).withMessage("Lượng calo phải là số nguyên không âm"),
  
  body("isVegetarian")
    .optional()
    .isBoolean().withMessage("Giá trị phải là true hoặc false"),
  
  body("isFeatured")
    .optional()
    .isBoolean().withMessage("Giá trị phải là true hoặc false"),
  
  body("isActive")
    .optional()
    .isBoolean().withMessage("Giá trị phải là true hoặc false")
]; 