import { API_URL } from '../lib/api-config';

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  stock: number;
  isVegetarian: boolean;
  isFeatured: boolean;
  isActive: boolean;
  tags?: string;
  preparationTime?: number;
  calories?: number;
  metaTitle?: string;
  metaDescription?: string;
  categories?: any[];
  rating: number;
  numReviews: number;
  likeCount: number;
}

export interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Lấy danh sách sản phẩm
export const getProducts = async (
  page = 1, 
  limit = 10, 
  category?: string, 
  search?: string, 
  featured?: boolean,
  vegetarian?: boolean
): Promise<ProductsResponse> => {
  let url = `${API_URL}/products?page=${page}&limit=${limit}`;
  
  if (category) url += `&category=${category}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (featured !== undefined) url += `&featured=${featured}`;
  if (vegetarian !== undefined) url += `&vegetarian=${vegetarian}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy danh sách sản phẩm');
  }
  
  return response.json();
};

// Lấy thông tin chi tiết sản phẩm
export const getProductById = async (id: number): Promise<Product> => {
  const response = await fetch(`${API_URL}/products/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy thông tin sản phẩm');
  }
  
  const data = await response.json();
  return data.product;
};

export async function getFeaturedProducts() {
  try {
    const response = await fetch(`${API_URL}/products?featured=true&limit=6`);
    if (!response.ok) throw new Error('Lỗi khi tải sản phẩm nổi bật');
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Lỗi:', error);
    throw error;
  }
}

export async function getProductsByCategory(category: string) {
  try {
    const response = await fetch(`${API_URL}/products?category=${category}&limit=8`);
    if (!response.ok) throw new Error('Lỗi khi tải sản phẩm theo danh mục');
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Lỗi:', error);
    throw error;
  }
}

// Thêm các hàm liên quan đến tính năng like

/**
 * Like hoặc unlike sản phẩm
 * @param productId ID của sản phẩm
 * @returns Thông tin về trạng thái like và số lượng like
 */
export async function likeProduct(productId: number) {
  try {
    const response = await fetch(`${API_URL}/products/${productId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Lỗi khi thích sản phẩm');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Lỗi:', error);
    throw error;
  }
}

/**
 * Kiểm tra trạng thái like của sản phẩm
 * @param productId ID của sản phẩm
 * @returns Thông tin về trạng thái like và số lượng like
 */
export async function checkProductLike(productId: number) {
  try {
    const response = await fetch(`${API_URL}/products/${productId}/check-like`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Lỗi khi kiểm tra trạng thái like');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Lỗi:', error);
    return { isLiked: false, likeCount: 0 }; // Trả về giá trị mặc định nếu có lỗi
  }
}

/**
 * Lấy danh sách sản phẩm đã like
 * @returns Danh sách sản phẩm đã like
 */
export async function getLikedProducts() {
  try {
    const response = await fetch(`${API_URL}/products/liked`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Lỗi khi lấy danh sách sản phẩm yêu thích');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Lỗi:', error);
    throw error;
  }
} 