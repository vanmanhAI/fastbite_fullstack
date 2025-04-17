// Kiểu dữ liệu của sản phẩm
export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId: number;
  price: number;
  stock: number;
  status: 'active' | 'unavailable';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Kiểu dữ liệu của danh mục sản phẩm
export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
}

// Kiểu dữ liệu của mã giảm giá
export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiry: string;
  status: 'active' | 'expired' | 'used';
  maxUses: number;
  currentUses: number;
  minPurchase: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Kiểu dữ liệu của đơn hàng
export interface Order {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  status: 'pending' | 'processing' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'cod' | 'stripe' | 'momo' | 'vnpay';
  totalAmount: number;
  shippingFee: number;
  discount: number;
  subtotal: number;
  orderItems: OrderItem[];
  deliveryAddress: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Kiểu dữ liệu của chi tiết đơn hàng
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

// Kiểu dữ liệu của người dùng
export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'customer';
  status: 'active' | 'inactive';
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

// Kiểu dữ liệu của thống kê
export interface Stats {
  totalSales: string;
  totalOrders: string;
  averageOrderValue: string;
  pendingOrders: string;
  recentOrders: Order[];
}

// Kiểu dữ liệu cho phân trang
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Response API với phân trang
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Kiểu dữ liệu của response API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Kiểu dữ liệu cho tham số API
export interface ProductParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string | number;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
} 