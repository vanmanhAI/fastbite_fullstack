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
    console.log('Path:', req.path);
    console.log('Authorization header:', req.headers.authorization);
    
    // Lấy token từ nhiều nguồn
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Cắt 'Bearer ' ra khỏi header
    } else {
      token = req.cookies?.token || req.cookies?.jwt;
    }
    
    console.log('[AUTH DEBUG] Token detected:', token ? `${token.substring(0, 10)}...` : 'No token');
    console.log('[AUTH DEBUG] JWT Secret available:', !!process.env.JWT_SECRET);
    
    // Kiểm tra token rỗng hoặc không hợp lệ
    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      console.log('[AUTH DEBUG] No valid token found, returning 401');
      return res.status(401).json({ 
        message: 'Vui lòng đăng nhập để tiếp tục',
        error: 'NO_TOKEN_PROVIDED' 
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      console.log('[AUTH DEBUG] Token verified successfully, userId:', (decoded as any).id);
      
      const user = await userRepository.findOne({ 
        where: { id: (decoded as any).id },
        select: ['id', 'email', 'name', 'role', 'isActive'] 
      });
      
      if (!user) {
        console.log('[AUTH DEBUG] User not found in database');
        return res.status(404).json({ 
          message: 'Không tìm thấy người dùng',
          error: 'USER_NOT_FOUND'
        });
      }
      
      if (!user.isActive) {
        console.log('[AUTH DEBUG] User account is disabled');
        return res.status(403).json({ 
          message: 'Tài khoản đã bị vô hiệu hóa',
          error: 'ACCOUNT_DISABLED'
        });
      }
      
      console.log('[AUTH DEBUG] User authenticated successfully:', user.id);
      req.user = user;
      next();
    } catch (error) {
      console.error('[AUTH DEBUG] JWT Error:', error);
      if ((error as Error).name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          message: 'Token không hợp lệ',
          error: 'INVALID_TOKEN'
        });
      } else if ((error as Error).name === 'TokenExpiredError') {
        return res.status(403).json({ 
          message: 'Token đã hết hạn, vui lòng đăng nhập lại',
          error: 'TOKEN_EXPIRED'
        });
      } else {
        return res.status(403).json({ 
          message: 'Lỗi xác thực token',
          error: 'AUTH_ERROR'
        });
      }
    }
  } catch (error) {
    console.error('[AUTH DEBUG] Lỗi xác thực:', error);
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
  console.log('Path:', req.path);
  console.log('Authorization header:', req.headers.authorization);
  
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Cắt 'Bearer ' ra khỏi header
  } else {
    token = req.cookies?.token || req.cookies?.jwt;
  }
  
  // Kiểm tra token rỗng hoặc không hợp lệ
  if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
    console.log('[AUTH DEBUG] No valid token in optional auth, continuing as guest');
    next();
    return;
  }
  
  try {
    // Có token, thực hiện xác thực bình thường
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number, role: string };
    
    // Gán thông tin người dùng vào request
    req.user = {
      id: decodedToken.id,
      role: decodedToken.role
    };
    
    console.log('[AUTH DEBUG] User authenticated in optional middleware:', decodedToken.id);
    next();
  } catch (error) {
    console.error('[AUTH DEBUG] Token không hợp lệ trong optional middleware:', error);
    // Token không hợp lệ nhưng vẫn cho phép tiếp tục
    next();
  }
}; 