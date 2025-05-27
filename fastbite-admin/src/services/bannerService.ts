import axiosClient from '@/lib/axios-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { ApiResponse, PaginatedResponse, Banner, BannerParams } from '@/lib/types';

/**
 * Lấy danh sách banner
 */
export const getBanners = async (params?: BannerParams): Promise<{
  banners: Banner[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  try {
    const response = await axiosClient.get<PaginatedResponse<Banner>>(
      API_ENDPOINTS.BANNERS,
      { params }
    );
    
    return {
      banners: response.data.data || [],
      pagination: response.data.pagination
    };
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    throw new Error(error.response?.data?.message || 'Không thể tải danh sách banner');
  }
};

/**
 * Lấy thông tin chi tiết banner theo ID
 */
export const getBannerById = async (id: number | string): Promise<Banner | null> => {
  try {
    const response = await axiosClient.get(
      API_ENDPOINTS.BANNER_DETAIL(id)
    );
    
    return response.data.banner || null;
  } catch (error: any) {
    console.error(`Error fetching banner with id ${id}:`, error);
    throw new Error(error.response?.data?.message || `Không thể tải thông tin banner với ID ${id}`);
  }
};

/**
 * Tạo banner mới
 */
export const createBanner = async (bannerData: FormData): Promise<Banner | null> => {
  try {
    // Log dữ liệu gửi đi để debug
    console.log('Banner data keys being sent:', Array.from(bannerData.keys()));
    
    // Kiểm tra xem có file hình ảnh không
    const imageFile = bannerData.get('image');
    if (!imageFile) {
      console.error('No image file found in form data');
    } else {
      console.log('Image file found:', imageFile instanceof File ? imageFile.name : 'not a File object');
    }
    
    // Đảm bảo trường isActive được chuyển đổi đúng
    if (bannerData.has('isActive')) {
      const isActiveValue = bannerData.get('isActive');
      // Chuyển đổi giá trị đúng cách
      bannerData.set('isActive', isActiveValue === 'true' || String(isActiveValue) === 'true' ? 'true' : 'false');
    }
    
    // Gửi request với Content-Type là multipart/form-data và loại bỏ header để axios tự xử lý
    const response = await axiosClient.post<ApiResponse<Banner>>(
      API_ENDPOINTS.BANNERS,
      bannerData,
      {
        headers: {
          'Content-Type': undefined // Để axios tự xử lý Content-Type cho FormData
        },
      }
    );
    return response.data.data || null;
  } catch (error: any) {
    console.error('Error creating banner:', error);
    // Hiển thị thông tin lỗi chi tiết hơn
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
};

/**
 * Cập nhật thông tin banner
 */
export const updateBanner = async (id: number | string, bannerData: FormData): Promise<Banner | null> => {
  try {
    // Đảm bảo trường isActive được chuyển đổi đúng
    if (bannerData.has('isActive')) {
      const isActiveValue = bannerData.get('isActive');
      // Chuyển đổi giá trị đúng cách
      bannerData.set('isActive', isActiveValue === 'true' || String(isActiveValue) === 'true' ? 'true' : 'false');
    }
    
    const response = await axiosClient.put<ApiResponse<Banner>>(
      API_ENDPOINTS.BANNER_DETAIL(id),
      bannerData,
      {
        headers: {
          'Content-Type': undefined // Để axios tự xử lý Content-Type cho FormData
        },
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error(`Error updating banner with id ${id}:`, error);
    throw error;
  }
};

/**
 * Xóa banner
 */
export const deleteBanner = async (id: number | string): Promise<boolean> => {
  try {
    await axiosClient.delete(API_ENDPOINTS.BANNER_DETAIL(id));
    return true;
  } catch (error) {
    console.error(`Error deleting banner with id ${id}:`, error);
    return false;
  }
};

/**
 * Xóa nhiều banner
 */
export const deleteMultipleBanners = async (ids: (number | string)[]): Promise<{
  success: number;
  failed: number;
}> => {
  let success = 0;
  let failed = 0;
  
  try {
    // Thực hiện xóa từng banner
    const promises = ids.map(async (id) => {
      try {
        await axiosClient.delete(API_ENDPOINTS.BANNER_DETAIL(id));
        success++;
        return true;
      } catch (error) {
        failed++;
        console.error(`Error deleting banner with id ${id}:`, error);
        return false;
      }
    });
    
    await Promise.all(promises);
    
    return { success, failed };
  } catch (error) {
    console.error('Error deleting multiple banners:', error);
    return { success, failed };
  }
}; 