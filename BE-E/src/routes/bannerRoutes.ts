import { Router } from "express";
import { authenticateToken, authorizeAdmin } from "../middlewares/authMiddleware";
import { 
  getBanners, 
  getBannerById, 
  getActiveBanners,
  createBanner, 
  updateBanner, 
  deleteBanner 
} from "../controllers/bannerController";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Cấu hình multer cho upload ảnh banner
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/banners");
    
    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'banner-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// Routes công khai - không cần đăng nhập
router.get("/active", getActiveBanners); // Lấy banner đang active

// Routes dành cho admin
router.get("/", authenticateToken, authorizeAdmin, getBanners);
router.get("/:id", authenticateToken, authorizeAdmin, getBannerById);
router.post("/", authenticateToken, authorizeAdmin, upload.single('image'), createBanner);
router.put("/:id", authenticateToken, authorizeAdmin, upload.single('image'), updateBanner);
router.delete("/:id", authenticateToken, authorizeAdmin, deleteBanner);

export default router; 