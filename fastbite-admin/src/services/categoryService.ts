import axiosClient from '@/lib/axios-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { ApiResponse, Category } from '@/lib/types';

/**
 * Lấy tất cả danh mục sản phẩm
 */
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await axiosClient.get<ApiResponse<any[]>>(API_ENDPOINTS.CATEGORIES);
    console.log('response', response);
    
    // Ánh xạ dữ liệu trả về để phù hợp với kiểu Category trong ứng dụng
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        imageUrl: item.image_url || ''
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Lấy thông tin chi tiết danh mục theo ID
 */
export const getCategoryById = async (id: number | string): Promise<Category | null> => {
  try {
    const response = await axiosClient.get<ApiResponse<Category>>(`${API_ENDPOINTS.CATEGORIES}/${id}`);
    return response.data.data || null;
  } catch (error) {
    console.error(`Error fetching category with id ${id}:`, error);
    return null;
  }
};

/**
 * Tạo danh mục mới
 */
export const createCategory = async (categoryData: FormData): Promise<Category | null> => {
  try {
    const response = await axiosClient.post<ApiResponse<Category>>(
      API_ENDPOINTS.CATEGORIES,
      categoryData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Cập nhật thông tin danh mục
 */
export const updateCategory = async (id: number | string, categoryData: FormData): Promise<Category | null> => {
  try {
    const response = await axiosClient.put<ApiResponse<Category>>(
      `${API_ENDPOINTS.CATEGORIES}/${id}`,
      categoryData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error(`Error updating category with id ${id}:`, error);
    throw error;
  }
};

/**
 * Xóa danh mục
 */
export const deleteCategory = async (id: number | string): Promise<boolean> => {
  try {
    await axiosClient.delete(`${API_ENDPOINTS.CATEGORIES}/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting category with id ${id}:`, error);
    return false;
  }
}; 