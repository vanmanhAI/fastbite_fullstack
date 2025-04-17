import { Router } from "express";
import { register, login, getCurrentUser } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Route đăng ký
router.post("/register", register);

// Route đăng nhập
router.post("/login", login);

// Route lấy thông tin người dùng hiện tại (yêu cầu xác thực)
router.get("/me", authenticateToken, getCurrentUser);

export default router; 