// API URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

// Local Storage Keys
export const AUTH_TOKEN_KEY = 'token';
export const USER_INFO_KEY = 'user_info';

// Pagination
export const ITEMS_PER_PAGE = 12;

// Order status
export const ORDER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}; 