import { API_URL } from '@/lib/constants';
import { getAuthHeader } from '@/lib/auth';

export interface OrderItem {
  id: number;
  productId: number;
  orderId: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    name: string;
    imageUrl: string;
  };
}

export interface Order {
  id: number;
  userId: number;
  status: 'pending' | 'approved' | 'rejected' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'cod' | 'stripe' | 'momo' | 'vnpay';
  totalAmount: number;
  shippingFee: number;
  discount: number;
  shippingAddress: string;
  shippingPhone: string;
  note?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export class OrderService {
  private static instance: OrderService;

  private constructor() {}

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  async getAllOrders(page: number = 1, limit: number = 10, status?: string): Promise<{ orders: Order[], pagination: any }> {
    try {
      const headers = getAuthHeader();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) {
        queryParams.append('status', status);
      }
      
      const response = await fetch(`${API_URL}/admin/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async getOrderById(id: number): Promise<Order> {
    try {
      const headers = getAuthHeader();
      const response = await fetch(`${API_URL}/admin/orders/${id}`, {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error fetching order #${id}:`, error);
      throw error;
    }
  }

  async approveOrder(id: number): Promise<Order> {
    try {
      const headers = getAuthHeader();
      const response = await fetch(`${API_URL}/admin/orders/${id}/approve`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve order');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error approving order #${id}:`, error);
      throw error;
    }
  }

  async rejectOrder(id: number, reason: string): Promise<Order> {
    try {
      const headers = getAuthHeader();
      const response = await fetch(`${API_URL}/admin/orders/${id}/reject`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to reject order');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error rejecting order #${id}:`, error);
      throw error;
    }
  }

  async shipOrder(id: number): Promise<Order> {
    try {
      const headers = getAuthHeader();
      const response = await fetch(`${API_URL}/admin/orders/${id}/ship`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to ship order');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error shipping order #${id}:`, error);
      throw error;
    }
  }

  async markAsDelivered(id: number): Promise<Order> {
    try {
      const headers = getAuthHeader();
      const response = await fetch(`${API_URL}/admin/orders/${id}/delivered`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark order as delivered');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error marking order #${id} as delivered:`, error);
      throw error;
    }
  }
} 