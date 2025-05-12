import { Router } from "express";
import { sendMessage, getChatHistory, getAllChatLogs, analyzeUserIntent } from "../controllers/chatController";
import { handleAIQuery, generateAIAnswer } from "../controllers/aiController";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { AppDataSource } from "../data-source";

const router = Router();

// Route công khai để gửi tin nhắn (không yêu cầu đăng nhập)
router.post("/message", sendMessage);

// Route để phân tích ý định người dùng
router.post("/analyze-intent", analyzeUserIntent);

// Route cần xác thực để lấy lịch sử chat
router.get("/history", authenticateToken, getChatHistory);

// Route admin để lấy tất cả chat logs
router.get("/logs", authenticateToken, authorizeAdmin, getAllChatLogs);

// Routes cho AI
router.post("/ai/query", handleAIQuery);
router.post("/ai/answer", generateAIAnswer);

// Route mới để kiểm tra chatbot từ frontend
router.post("/chatbot", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tin nhắn"
      });
    }
    
    // Chuyển tiếp đến endpoint xử lý
    return handleAIQuery(req, res);
  } catch (error) {
    console.error("Lỗi khi xử lý chatbot:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xử lý chatbot"
    });
  }
});

// Endpoint kiểm tra kết nối cơ sở dữ liệu
router.get("/db-test", async (req, res) => {
  try {
    // Lấy thông tin cấu hình DB từ biến môi trường
    const dbConfig = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      username: process.env.DB_USERNAME || "root",
      password: process.env.DB_PASSWORD || "InternLOL123.",
      database: process.env.DB_DATABASE || "fastbite_db"
    };
    
    console.log("Thông tin kết nối DB:", {
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      database: dbConfig.database
    });
    
    try {
      // Thực thi truy vấn đơn giản để kiểm tra kết nối
      const result = await AppDataSource.query("SELECT id, name, description, price, image_url FROM products WHERE is_active = 1 LIMIT 3");
      console.log('Kết quả truy vấn products: ', result);
      
      if (result && result.length >= 0) {
        console.log("Kết nối DB thành công!");
        return res.status(200).json({
          success: true,
          message: "Kết nối cơ sở dữ liệu thành công",
          data: result,
          config: {
            host: dbConfig.host,
            port: dbConfig.port,
            username: dbConfig.username,
            database: dbConfig.database
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        message: "Kết nối cơ sở dữ liệu thất bại - không có dữ liệu trả về"
      });
    } catch (queryError) {
      console.error("Lỗi khi thực thi truy vấn DB:", queryError);
      
      // Nếu có lỗi kết nối, thử kiểm tra trạng thái của DataSource
      const dataSourceStatus = {
        isInitialized: AppDataSource.isInitialized,
        driver: AppDataSource.driver ? AppDataSource.driver.constructor.name : 'không có',
        options: {
          type: AppDataSource.options.type,
          database: AppDataSource.options.database
        }
      };
      
      return res.status(500).json({
        success: false,
        message: "Kết nối cơ sở dữ liệu thất bại - lỗi truy vấn",
        error: queryError instanceof Error ? queryError.message : "Lỗi không xác định",
        dataSourceStatus
      });
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra kết nối DB:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra kết nối cơ sở dữ liệu",
      error: error instanceof Error ? error.message : "Lỗi không xác định",
    });
  }
});

export default router; 