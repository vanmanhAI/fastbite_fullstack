import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import * as chatController from "../controllers/chatController";
import * as recommendationController from "../controllers/recommendationController";

const router = express.Router();

// Chatbot routes
router.post("/chatbot/message", chatController.sendMessage);
router.get("/chatbot/history", authenticateToken, chatController.getChatHistory);

// Thêm route mới cho việc kiểm thử khả năng đề xuất cá nhân hóa của chatbot
router.get("/chatbot/personalized-recommendations", authenticateToken, chatController.getPersonalizedRecommendations);

export default router; 