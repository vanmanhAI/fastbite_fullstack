import { Router } from "express";
import { CartController } from "../controllers/CartController";
import { authenticateToken, optionalAuthMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const cartController = new CartController();

// API cho khách vãng lai (không yêu cầu đăng nhập)
router.post("/guest/add", optionalAuthMiddleware, cartController.addGuestToCart);

// Middleware xác thực cho các API giỏ hàng còn lại
router.use(authenticateToken);

// Lấy giỏ hàng của người dùng
router.get("/", cartController.getCart);

// Thêm sản phẩm vào giỏ hàng
router.post("/add", cartController.addToCart);

// Cập nhật số lượng sản phẩm trong giỏ hàng
router.put("/update", cartController.updateCartItem);

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/remove/:productId", cartController.removeFromCart);

// Xóa toàn bộ giỏ hàng
router.delete("/clear", cartController.clearCart);

// Đồng bộ giỏ hàng từ localStorage
router.post("/sync", cartController.syncCart);

export default router; 