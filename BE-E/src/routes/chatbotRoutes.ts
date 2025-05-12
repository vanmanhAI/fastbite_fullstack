import express from "express";
import { sendMessage, getChatHistory } from "../controllers/chatController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

// API xử lý tin nhắn chatbot (hỗ trợ cả người dùng đã đăng nhập và chưa đăng nhập)
router.post("/message", sendMessage);

// API lấy lịch sử chat (chỉ cho người dùng đã đăng nhập)
router.get("/history", authenticateToken, getChatHistory);

export default router; 