import { Router } from "express";
import { register, login, getCurrentUser, logout, refreshToken } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Route đăng ký
router.post("/register", register);

// Route đăng nhập
router.post("/login", login);

// Route lấy thông tin người dùng hiện tại
router.get("/me", authenticateToken, getCurrentUser);

// Route đăng xuất
router.post("/logout", authenticateToken, logout);

// Route refresh token
router.post("/refresh", authenticateToken, refreshToken);

export default router;