import { API_URL } from '@/lib/api-config';

export interface UserPreferences {
  favoriteCategories?: string[];
  dietaryRestrictions?: string[];
  tastePreferences?: {
    spicy?: boolean;
    sweet?: boolean;
    sour?: boolean;
    bitter?: boolean;
    savory?: boolean;
  };
  notificationSettings?: {
    email?: boolean;
    promotions?: boolean;
    orderUpdates?: boolean;
  };
}

const BASE_URL = `${API_URL}/user-preferences`;

// Lấy thông tin ưu tiên của người dùng
export const getUserPreferences = async (): Promise<{ preferences: UserPreferences }> => {
  // Thông báo tính năng đã bị loại bỏ
  console.log('Tính năng UserPreferences đã bị loại bỏ. Sử dụng hành vi người dùng để cá nhân hóa');
  
  // Trả về đối tượng mặc định
  return {
    preferences: {
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
    }
  };
};

// Cập nhật thông tin ưu tiên của người dùng
export const updateUserPreferences = async (preferences: UserPreferences): Promise<{ preferences: UserPreferences }> => {
  // Thông báo tính năng đã bị loại bỏ
  console.log('Tính năng UserPreferences đã bị loại bỏ. Sử dụng hành vi người dùng để cá nhân hóa');
  
  // Giả lập thành công
  return {
    preferences: preferences
  };
}; 