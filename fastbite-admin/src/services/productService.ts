import axiosClient from '@/lib/axios-client';
import { API_ENDPOINTS } from '@/lib/api-config';
import { ApiResponse, PaginatedResponse, Product, ProductParams } from '@/lib/types';

/**
 * Lấy danh sách sản phẩm
 */
export const getProducts = async (params?: ProductParams): Promise<{
  products: Product[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  try {
    const response = await axiosClient.get<PaginatedResponse<Product>>(
      API_ENDPOINTS.PRODUCTS,
      { params }
    );
    
    return {
      products: response.data.data || [],
      pagination: response.data.pagination
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { products: [] };
  }
};

/**
 * Lấy thông tin chi tiết sản phẩm theo ID
 */
export const getProductById = async (id: number | string): Promise<Product | null> => {
  try {
    const response = await axiosClient.get<ApiResponse<Product>>(
      API_ENDPOINTS.PRODUCT_DETAIL(id)
    );
    return response.data.data || null;
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    return null;
  }
};

/**
 * Tạo sản phẩm mới
 */
export const createProduct = async (productData: FormData): Promise<Product | null> => {
  try {
    const response = await axiosClient.post<ApiResponse<Product>>(
      API_ENDPOINTS.PRODUCTS,
      productData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Cập nhật thông tin sản phẩm
 */
export const updateProduct = async (id: number | string, productData: FormData): Promise<Product | null> => {
  try {
    const response = await axiosClient.put<ApiResponse<Product>>(
      API_ENDPOINTS.PRODUCT_DETAIL(id),
      productData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || null;
  } catch (error) {
    console.error(`Error updating product with id ${id}:`, error);
    throw error;
  }
};

/**
 * Xóa sản phẩm
 */
export const deleteProduct = async (id: number | string): Promise<boolean> => {
  try {
    await axiosClient.delete(API_ENDPOINTS.PRODUCT_DETAIL(id));
    return true;
  } catch (error) {
    console.error(`Error deleting product with id ${id}:`, error);
    return false;
  }
};

/**
 * Cập nhật trạng thái sản phẩm
 */
export const updateProductStatus = async (
  id: number | string, 
  status: 'active' | 'unavailable'
): Promise<boolean> => {
  try {
    await axiosClient.patch(API_ENDPOINTS.PRODUCT_DETAIL(id), { status });
    return true;
  } catch (error) {
    console.error(`Error updating product status with id ${id}:`, error);
    return false;
  }
};

/**
 * Xóa nhiều sản phẩm
 */
export const deleteMultipleProducts = async (ids: (number | string)[]): Promise<{
  success: number;
  failed: number;
}> => {
  let success = 0;
  let failed = 0;
  
  try {
    // Thực hiện xóa từng sản phẩm
    const promises = ids.map(async (id) => {
      try {
        await axiosClient.delete(API_ENDPOINTS.PRODUCT_DETAIL(id));
        success++;
        return true;
      } catch (error) {
        failed++;
        console.error(`Error deleting product with id ${id}:`, error);
        return false;
      }
    });
    
    await Promise.all(promises);
    
    return { success, failed };
  } catch (error) {
    console.error('Error deleting multiple products:', error);
    return { success, failed };
  }
}; 