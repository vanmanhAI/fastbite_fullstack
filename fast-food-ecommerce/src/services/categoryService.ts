import {API_URL} from '../lib/api-config';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  parent?: Category;
  children?: Category[];
}

// Lấy tất cả danh mục
export const getAllCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${API_URL}/categories`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy danh sách danh mục');
  }
  
  const data = await response.json();
  return data.data;
};

// Lấy danh mục theo slug
export const getCategoryBySlug = async (slug: string): Promise<Category> => {
  const response = await fetch(`${API_URL}/categories/slug/${slug}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy thông tin danh mục');
  }
  
  const data = await response.json();
  return data.category;
}; 