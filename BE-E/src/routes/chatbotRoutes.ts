import express from "express";
import { sendMessage, getChatHistory, getPersonalizedRecommendations, analyzeUserIntent } from "../controllers/chatController";
import { authenticateToken, optionalAuthMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

// API phân tích ý định (không yêu cầu đăng nhập)
router.post("/analyze-intent", analyzeUserIntent);

// API xử lý tin nhắn chatbot (sử dụng auth tùy chọn để trả về đề xuất cá nhân hóa nếu đăng nhập)
router.post("/message", optionalAuthMiddleware, sendMessage);

// API lấy lịch sử chat (chỉ cho người dùng đã đăng nhập)
router.get("/history", authenticateToken, getChatHistory);

// API kiểm thử đề xuất cá nhân hóa (chỉ cho người dùng đã đăng nhập)
router.get("/personalized-recommendations", authenticateToken, getPersonalizedRecommendations);

// API kiểm tra kết nối database (không yêu cầu đăng nhập)
router.get("/db-test", (req, res) => {
  res.status(200).json({ success: true, message: "Connection successful" });
});

export default router; 