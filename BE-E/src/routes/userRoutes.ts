import { Router } from "express";
import { 
  register, login, getProfile, updateProfile, changePassword, 
  getAllUsers, updateUserRole 
} from "../controllers/userController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";

const router = Router();

// Đăng ký và đăng nhập
router.post("/register", register);
router.post("/login", login);

// Cập nhật thông tin cá nhân - cần xác thực
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.post("/change-password", authenticateToken, changePassword);

// Admin routes
router.get("/", authenticateToken, authorizeAdmin, getAllUsers);
router.put("/:userId/role", authenticateToken, authorizeAdmin, updateUserRole);

export default router; 