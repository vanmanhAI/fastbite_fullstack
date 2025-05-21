import axios from 'axios';
import { API_URL } from '@/lib/constants';
import { getAuthToken } from '@/lib/auth';

export type CartItem = {
  id: number;
  productId: number;
  userId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    description: string;
    image: string;
    stock: number;
  };
};

// Lấy giỏ hàng từ localStorage (chỉ cho khách vãng lai)
export const getCartFromLocalStorage = (): CartItem[] => {
  try {
    const key = 'cart_guest';
    const cartData = localStorage.getItem(key);
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error('Error getting cart from localStorage:', error);
    return [];
  }
};

// Lưu giỏ hàng vào localStorage (chỉ cho khách vãng lai)
export const saveCartToLocalStorage = (cart: CartItem[]): void => {
  try {
    const key = 'cart_guest';
    localStorage.setItem(key, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

// Tính tổng giá trị giỏ hàng
export const calculateCartTotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
};

// Xóa giỏ hàng từ localStorage
export const clearCart = (): void => {
  try {
    localStorage.removeItem('cart_guest');
  } catch (error) {
    console.error('Error clearing cart from localStorage:', error);
  }
};

export class CartService {
  private static instance: CartService;

  private constructor() {}

  static getInstance() {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  private getHeaders() {
    // Lấy token mới nhất mỗi khi gọi API
    try {
      const token = getAuthToken();
      console.log("CartService - Current token:", token ? `${token.substring(0, 15)}...` : "No token");
      
      if (!token) {
        console.warn("CartService - No token available for authenticated request");
        return {
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
      
      // Kiểm tra token rỗng
      if (token.trim() === '') {
        console.warn("CartService - Empty token detected");
        return {
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
      
      console.log("CartService - Sending request with Authorization header");
      return {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
    } catch (error) {
      console.error("CartService - Error getting headers:", error);
      return {
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
  }

  // Lấy giỏ hàng từ server
  async getCart(): Promise<CartItem[]> {
    try {
      const response = await axios.get(`${API_URL}/cart`, this.getHeaders());
      return response.data.data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      return [];
    }
  }

  // Thêm sản phẩm vào giỏ hàng
  async addToCart(productId: number, quantity: number): Promise<CartItem | null> {
    try {
      const response = await axios.post(
        `${API_URL}/cart/add`,
        { productId, quantity },
        this.getHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Ném lỗi để component có thể xử lý
      throw error;
    }
  }

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  async updateQuantity(productId: number, quantity: number): Promise<CartItem | null> {
    try {
      const response = await axios.put(
        `${API_URL}/cart/update`,
        { productId, quantity },
        this.getHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  // Xóa sản phẩm khỏi giỏ hàng
  async removeFromCart(productId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete(
        `${API_URL}/cart/remove/${productId}`,
        this.getHeaders()
      );
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  // Xóa toàn bộ giỏ hàng
  async clearCart(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete(`${API_URL}/cart/clear`, this.getHeaders());
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // Đồng bộ giỏ hàng từ localStorage vào server khi đăng nhập
  async syncLocalCartToServer(localCart: CartItem[]): Promise<boolean> {
    if (localCart.length === 0) return true;
    
    try {
      const response = await axios.post(
        `${API_URL}/cart/sync`,
        { items: localCart },
        this.getHeaders()
      );
      
      return response.data.success;
    } catch (error) {
      console.error('Error syncing local cart to server:', error);
      return false;
    }
  }

  // Tính tổng giá trị giỏ hàng
  calculateTotal(cart: CartItem[]): number {
    return cart.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  }
} 