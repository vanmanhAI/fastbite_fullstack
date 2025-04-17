// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_URL}/auth/login`,
  REGISTER: `${API_URL}/auth/register`,
  
  // Products
  PRODUCTS: `${API_URL}/products`,
  PRODUCT_DETAIL: (id: number | string) => `${API_URL}/products/${id}`,
  
  // Categories
  CATEGORIES: `${API_URL}/categories`,
  
  // Coupons
  COUPONS: `${API_URL}/coupons`,
  COUPON_DETAIL: (id: number | string) => `${API_URL}/coupons/${id}`,
  
  // Orders
  ORDERS: `${API_URL}/orders`,
  ORDER_DETAIL: (id: number | string) => `${API_URL}/orders/${id}`,
  
  // Customers
  CUSTOMERS: `${API_URL}/users`,
  CUSTOMER_DETAIL: (id: number | string) => `${API_URL}/users/${id}`,
  
  // Stats
  STATS: `${API_URL}/stats`,
};

export default API_URL; 