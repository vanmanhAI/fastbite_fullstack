import jwt from 'jsonwebtoken';

interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Lấy thông tin người dùng từ JWT token
 */
export async function getUserFromToken(token: string): Promise<UserData | null> {
  try {
    // Đảm bảo có một secret key
    const secretKey = process.env.JWT_SECRET || 'fastbite-secret-key';
    
    // Giải mã token
    const decoded = jwt.verify(token, secretKey) as UserData;
    
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'user'
    };
  } catch (error) {
    console.error('Lỗi khi giải mã token:', error);
    return null;
  }
} 