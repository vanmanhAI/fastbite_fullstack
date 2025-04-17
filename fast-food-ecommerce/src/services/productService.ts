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