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
    
    // Xử lý và chuẩn hóa dữ liệu sản phẩm
    const products = (response.data.data || [])
      .filter(product => !product.isDeleted) // Lọc bỏ các sản phẩm đã xóa
      .map(product => {
        // Đảm bảo trường status luôn được thiết lập dựa trên isActive và stock
        if (product.stock <= 0) {
          // Nếu stock = 0, luôn đánh dấu là unavailable
          product.status = 'unavailable';
          product.isActive = false;
        } else if (!product.status && product.isActive !== undefined) {
          product.status = product.isActive ? 'active' : 'unavailable';
        }
        return product;
      });
    
    return {
      products,
      pagination: response.data.pagination
    };
  } catch (error: any) {
    console.error('Error fetching products:', error);
    throw new Error(error.response?.data?.message || 'Không thể tải danh sách sản phẩm');
  }
};

/**
 * Lấy thông tin chi tiết sản phẩm theo ID
 */
export const getProductById = async (id: number | string): Promise<Product | null> => {
  try {
    const response = await axiosClient.get(
      API_ENDPOINTS.PRODUCT_DETAIL(id)
    );
    
    // API trả về { product: {...} } thay vì { data: {...} }
    const product = response.data.product || response.data.data;
    
    if (product) {
      // Đảm bảo trường status luôn được thiết lập dựa trên isActive và stock
      if (product.stock <= 0) {
        // Nếu stock = 0, luôn đánh dấu là unavailable
        product.status = 'unavailable';
        product.isActive = false;
      } else if (!product.status && product.isActive !== undefined) {
        product.status = product.isActive ? 'active' : 'unavailable';
      }
      
      // Chuyển đổi category thành categoryId nếu cần
      if (product.categories && product.categories.length > 0 && !product.categoryId) {
        product.categoryId = product.categories[0].id;
      }
      
      return product;
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw new Error(error.response?.data?.message || `Không thể tải thông tin sản phẩm với ID ${id}`);
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