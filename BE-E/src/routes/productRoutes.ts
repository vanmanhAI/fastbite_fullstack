import { Router } from "express";
import { 
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
} from "../controllers/productController";
import { getReviewsByProduct, createReview } from "../controllers/reviewController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validationMiddleware";
import { createReviewValidator } from "../validators/reviewValidators";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as productLikeController from "../controllers/productLikeController";

const router = Router();

// Cấu hình multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/products");
    
    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// Route cho người dùng thông thường
router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/:id/reviews", getReviewsByProduct);
router.post("/:id/reviews", authenticateToken, validate(createReviewValidator), createReview);

// Route chỉ dành cho admin
router.post("/", authenticateToken, authorizeAdmin, upload.single('image'), createProduct);
router.put("/:id", authenticateToken, authorizeAdmin, upload.single('image'), updateProduct);
router.delete("/:id", authenticateToken, authorizeAdmin, deleteProduct);

// Các routes cho tính năng like sản phẩm
router.post("/:productId/like", authenticateToken, productLikeController.likeProduct);
router.get("/:productId/check-like", authenticateToken, productLikeController.checkProductLike);
router.get("/liked", authenticateToken, productLikeController.getLikedProducts);

export default router; 