import { API_URL } from '../lib/api-config';

export interface Banner {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  type: 'hero' | 'promotion' | 'product' | 'category';
  position: 'home_top' | 'home_middle' | 'home_bottom' | 'category_page' | 'product_page';
  order: number;
  backgroundColor?: string;
  textColor?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface BannersResponse {
  data: Banner[];
}

// Lấy banner đang active theo loại hoặc vị trí
export const getActiveBanners = async (type?: string, position?: string): Promise<Banner[]> => {
  try {
    let url = `${API_URL}/banners/active`;
    const params = new URLSearchParams();
    
    if (type) params.append('type', type);
    if (position) params.append('position', position);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log('Fetching banners from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        data: error
      });
      throw new Error(error.message || 'Không thể lấy banner');
    }
    
    const result = await response.json();
    console.log('Banners received:', result);
    return result.data || [];
  } catch (error) {
    console.error('Lỗi khi lấy banner:', error);
    return [];
  }
};

// Lấy banner hero cho trang chủ
export const getHeroBanners = async (): Promise<Banner[]> => {
  return getActiveBanners('hero', 'home_top');
};

// Lấy banner sản phẩm cho trang chủ
export const getProductBanners = async (): Promise<Banner[]> => {
  return getActiveBanners('product', 'home_middle');
};

// Lấy banner khuyến mãi cho trang chủ
export const getPromotionBanners = async (): Promise<Banner[]> => {
  return getActiveBanners('promotion', 'home_bottom');
};

// Lấy banner cho trang danh mục
export const getCategoryPageBanners = async (): Promise<Banner[]> => {
  return getActiveBanners(undefined, 'category_page');
};

// Lấy banner cho trang danh sách sản phẩm
export const getProductListBanners = async (): Promise<Banner[]> => {
  return getActiveBanners('product', 'product_page');
};

export default {
  getActiveBanners,
  getHeroBanners,
  getProductBanners,
  getPromotionBanners,
  getCategoryPageBanners,
  getProductListBanners
}; 