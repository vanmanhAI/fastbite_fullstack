import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/auth";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

const userRepository = AppDataSource.getRepository(User);

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Không có token xác thực" });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json({ message: "Token không hợp lệ hoặc hết hạn" });
    }

    const user = await userRepository.findOne({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Tài khoản không tồn tại hoặc đã bị khóa" });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error("Lỗi xác thực:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xác thực" });
  }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log(req.user);
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Không đủ quyền thực hiện hành động này" });
  }
  next();
}; 