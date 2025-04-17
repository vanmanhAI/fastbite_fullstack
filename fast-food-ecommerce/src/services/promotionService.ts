import {API_URL} from '../lib/api-config';
import { getAuthToken } from '../lib/auth';

export interface Promotion {
  id: number;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CouponValidation {
  coupon: {
    code: string;
    usageLimit: number;
    usageCount: number;
  };
  promotion: {
    id: number;
    name: string;
    discountType: string;
    discountValue: number;
  };
}

// Lấy danh sách khuyến mãi đang hoạt động
export const getActivePromotions = async (): Promise<Promotion[]> => {
  const response = await fetch(`${API_URL}/promotions/active`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy danh sách khuyến mãi');
  }
  
  const data = await response.json();
  return data.promotions;
};

// Áp dụng mã giảm giá
export const applyCoupon = async (code: string): Promise<CouponValidation> => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_URL}/promotions/apply-coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Mã giảm giá không hợp lệ');
  }
  
  return response.json();
};

// Tính số tiền giảm giá
export const calculateDiscount = (total: number, promotion: Promotion | null): number => {
  if (!promotion) return 0;
  
  if (promotion.discountType === 'percentage') {
    return (total * promotion.discountValue) / 100;
  } else {
    return Math.min(promotion.discountValue, total); // Không giảm nhiều hơn tổng tiền
  }
}; 