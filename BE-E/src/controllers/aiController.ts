import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { processMessageWithRAG, generateAndExecuteQuery } from '../services/aiService';
import { ChatLog } from '../models/ChatLog';

const chatLogRepository = AppDataSource.getRepository(ChatLog);

/**
 * API endpoint để xử lý truy vấn AI từ frontend
 * @route POST /api/ai/query
 */
export const handleAIQuery = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    const userId = req.user?.id;
    
    if (!question) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu câu hỏi trong yêu cầu' 
      });
    }

    // Sử dụng hàm processMessageWithRAG từ aiService
    const response = await processMessageWithRAG(question);

    // Lưu log
    const chatLog = chatLogRepository.create({
      userId,
      message: question,
      response,
      intent: 'query'
    });
    await chatLogRepository.save(chatLog);

    return res.status(200).json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Lỗi khi xử lý truy vấn AI:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý truy vấn AI',
      error: error instanceof Error ? error.message : 'Lỗi không xác định'
    });
  }
};

/**
 * API endpoint để tạo câu trả lời từ AI với truy vấn cơ sở dữ liệu
 * @route POST /api/ai/answer
 */
export const generateAIAnswer = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    const userId = req.user?.id;
    
    if (!question) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu câu hỏi trong yêu cầu' 
      });
    }

    // Sử dụng trực tiếp hàm generateAndExecuteQuery từ aiService
    const response = await generateAndExecuteQuery(question);

    // Lưu log
    const chatLog = chatLogRepository.create({
      userId,
      message: question,
      response,
      intent: 'answer'
    });
    await chatLogRepository.save(chatLog);

    return res.status(200).json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Lỗi khi tạo câu trả lời AI:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo câu trả lời AI',
      error: error instanceof Error ? error.message : 'Lỗi không xác định'
    });
  }
};

// Thực hiện truy vấn SQL đến database
const executeQuery = async (sql: string): Promise<any> => {
  try {
    console.log("Bắt đầu thực thi truy vấn SQL:", sql);
    const result = await AppDataSource.query(sql);
    console.log("Kết quả truy vấn:", result);
    return result;
  } catch (err) {
    console.log("query failed:", sql);
    console.log("error:", err);
    console.error("Lỗi chi tiết khi truy vấn database:", err);
    throw err;
  }
}

// Hàm để xử lý và thực thi truy vấn tìm kiếm sản phẩm
const performProductSearch = async (query: string): Promise<any> => {
  console.log("SQL query được tạo:", query);
  try {
    let productQuery = query;

    // Đảm bảo truy vấn đúng tên cột trong database (snake_case)
    productQuery = productQuery.replace(/imageUrl/g, 'image_url')
                              .replace(/isActive/g, 'is_active')
                              .replace(/createdAt/g, 'created_at')
                              .replace(/updatedAt/g, 'updated_at');
                              
    return await executeQuery(productQuery);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm sản phẩm:", error);
    throw error;
  }
}; 