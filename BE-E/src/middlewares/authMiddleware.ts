import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const userRepository = AppDataSource.getRepository(User);

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('===== AUTH DEBUG =====');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Cookies:', req.cookies);
    
    // Lấy token từ nhiều nguồn
    let token = req.headers.authorization?.split(' ')[1] || 
                req.cookies?.token || 
                req.cookies?.jwt;  // Thêm kiểm tra jwt cookie
    
    console.log('Token detected:', token ? 'Yes' : 'No');
    
    // Kiểm tra token rỗng hoặc không hợp lệ
    if (!token || token.trim() === '') {
      console.log('No valid token found, returning 401');
      return res.status(401).json({ 
        message: 'Vui lòng đăng nhập để tiếp tục',
        error: 'NO_TOKEN_PROVIDED' 
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      console.log('Token verified successfully:', decoded);
      
      const user = await userRepository.findOne({ 
        where: { id: (decoded as any).id },
        select: ['id', 'email', 'name', 'role', 'isActive'] 
      });
      
      if (!user) {
        console.log('User not found in database');
        return res.status(404).json({ 
          message: 'Không tìm thấy người dùng',
          error: 'USER_NOT_FOUND'
        });
      }
      
      if (!user.isActive) {
        console.log('User account is disabled');
        return res.status(403).json({ 
          message: 'Tài khoản đã bị vô hiệu hóa',
          error: 'ACCOUNT_DISABLED'
        });
      }
      
      console.log('User authenticated:', user.id);
      req.user = user;
      next();
    } catch (error) {
      console.error('Lỗi xác thực JWT:', error);
      return res.status(403).json({ 
        message: 'Token không hợp lệ hoặc đã hết hạn',
        error: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    return res.status(500).json({ 
      message: 'Lỗi server khi xác thực',
      error: 'SERVER_ERROR' 
    });
  }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Bạn chưa đăng nhập',
      error: 'NOT_AUTHENTICATED'
    });
  }
  
  if (req.user.role === UserRole.ADMIN) {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Bạn không có quyền truy cập',
      error: 'NOT_AUTHORIZED'
    });
  }
};

// Middleware xác thực không bắt buộc (cho phép người dùng không đăng nhập)
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('===== OPTIONAL AUTH DEBUG =====');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || authHeader.trim() === '' || authHeader === 'Bearer null' || authHeader === 'Bearer undefined') {
    // Không có token hoặc token không hợp lệ, người dùng không đăng nhập nhưng vẫn cho phép tiếp tục
    console.log('No valid authorization header, allowing as guest');
    next();
    return;
  }
  
  try {
    // Có token, thực hiện xác thực bình thường
    const token = authHeader.split(' ')[1];
    
    // Kiểm tra token rỗng
    if (!token || token.trim() === '') {
      console.log('Empty token, allowing as guest');
      next();
      return;
    }
    
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number, role: string };
    
    // Gán thông tin người dùng vào request
    req.user = {
      id: decodedToken.id,
      role: decodedToken.role
    };
    
    console.log('User authenticated in optional middleware:', decodedToken.id);
    next();
  } catch (error) {
    console.error('Token không hợp lệ trong optional middleware:', error);
    // Token không hợp lệ nhưng vẫn cho phép tiếp tục
    next();
  }
}; 