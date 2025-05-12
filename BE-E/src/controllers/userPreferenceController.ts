import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

const userRepository = AppDataSource.getRepository(User);

// Lấy thông tin ưu tiên của người dùng
export const getUserPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['preferences']
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Đảm bảo định dạng trả về đúng cấu trúc
    const defaultPreferences = {
      favoriteCategories: [],
      dietaryRestrictions: [],
      tastePreferences: {
        spicy: false,
        sweet: false,
        sour: false,
        bitter: false,
        savory: false
      },
      notificationSettings: {
        email: true,
        promotions: true,
        orderUpdates: true
      }
    };
    
    return res.status(200).json({
      preferences: user.preferences ? {
        ...defaultPreferences,
        ...user.preferences
      } : defaultPreferences
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin ưu tiên:', error);
    return res.status(500).json({
      message: 'Không thể lấy thông tin ưu tiên, vui lòng thử lại sau',
    });
  }
};

// Cập nhật thông tin ưu tiên của người dùng
export const updateUserPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ'
      });
    }
    
    const user = await userRepository.findOne({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Cập nhật hoặc thêm mới các thuộc tính ưu tiên
    // Đảm bảo lưu đúng cấu trúc JSON
    user.preferences = {
      ...(user.preferences || {}),
      ...preferences,
      // Đảm bảo cấu trúc đúng cho nested objects
      tastePreferences: {
        ...(user.preferences?.tastePreferences || {}),
        ...(preferences.tastePreferences || {})
      },
      notificationSettings: {
        ...(user.preferences?.notificationSettings || {}),
        ...(preferences.notificationSettings || {})
      }
    };
    
    await userRepository.save(user);
    
    return res.status(200).json({
      message: 'Cập nhật thông tin ưu tiên thành công',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Lỗi cập nhật thông tin ưu tiên:', error);
    return res.status(500).json({
      message: 'Không thể cập nhật thông tin ưu tiên, vui lòng thử lại sau',
    });
  }
}; 