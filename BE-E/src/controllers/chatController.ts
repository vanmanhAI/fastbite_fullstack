import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChatLog } from "../models/ChatLog";
import { processMessageWithRAG, ChatMessage } from "../services/aiService";

const chatLogRepository = AppDataSource.getRepository(ChatLog);

// Gửi tin nhắn đến chatbot và nhận phản hồi
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tin nhắn'
      });
    }
    
    // Sử dụng Gemini API để xử lý tin nhắn - truyền sessionId để duy trì ngữ cảnh
    const response = await processMessageWithRAG(message, sessionId);
    
    // Lưu tin nhắn vào cơ sở dữ liệu
    const chatLog = chatLogRepository.create({
      userId: req.user?.id, // Nếu có thông tin user
      message,
      response,
      intent: 'query',
      sessionId
    });
    
    await chatLogRepository.save(chatLog);
    
    return res.status(200).json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xử lý tin nhắn'
    });
  }
};

// Lấy lịch sử chat của người dùng
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, sessionId } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập'
      });
    }
    
    let query = chatLogRepository.createQueryBuilder('chat')
      .where('chat.userId = :userId', { userId })
      .orderBy('chat.createdAt', 'DESC')
      .take(Number(limit));
      
    // Nếu có sessionId, lọc theo session
    if (sessionId) {
      query = query.andWhere('chat.sessionId = :sessionId', { sessionId });
    }
    
    const history = await query.getMany();

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy lịch sử chat'
    });
  }
};

// Lấy tất cả chat logs (dành cho admin)
export const getAllChatLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await chatLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: Number(limit),
      skip
    });

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy tất cả chat logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy chat logs'
    });
  }
}; 