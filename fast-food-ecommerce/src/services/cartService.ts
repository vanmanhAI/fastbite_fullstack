import { Product } from './productService';

export interface CartItem {
  product: Product;
  quantity: number;
}

// Tạo key cho giỏ hàng dựa trên userId
const getCartKey = (userId?: number | null): string => {
  return userId ? `cart_${userId}` : 'cart_guest';
};

// Lưu giỏ hàng vào localStorage
export const saveCartToLocalStorage = (cart: CartItem[], userId?: number | null) => {
  const cartKey = getCartKey(userId);
  localStorage.setItem(cartKey, JSON.stringify(cart));
};

// Lấy giỏ hàng từ localStorage
export const getCartFromLocalStorage = (userId?: number | null): CartItem[] => {
  const cartKey = getCartKey(userId);
  const cart = localStorage.getItem(cartKey);
  return cart ? JSON.parse(cart) : [];
};

// Thêm sản phẩm vào giỏ hàng
export const addToCart = (cart: CartItem[], product: Product, quantity: number = 1): CartItem[] => {
  const existingItemIndex = cart.findIndex(item => item.product.id === product.id);
  
  if (existingItemIndex >= 0) {
    // Nếu sản phẩm đã tồn tại trong giỏ, tăng số lượng
    const updatedCart = [...cart];
    updatedCart[existingItemIndex].quantity += quantity;
    return updatedCart;
  } else {
    // Nếu là sản phẩm mới, thêm vào giỏ
    return [...cart, { product, quantity }];
  }
};

// Cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCartItemQuantity = (cart: CartItem[], productId: number, quantity: number): CartItem[] => {
  if (quantity <= 0) {
    // Nếu số lượng là 0 hoặc âm, xóa sản phẩm khỏi giỏ hàng
    return cart.filter(item => item.product.id !== productId);
  }
  
  return cart.map(item => {
    if (item.product.id === productId) {
      return { ...item, quantity };
    }
    return item;
  });
};

// Xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = (cart: CartItem[], productId: number): CartItem[] => {
  return cart.filter(item => item.product.id !== productId);
};

// Xóa toàn bộ giỏ hàng
export const clearCart = (userId?: number | null): CartItem[] => {
  const cartKey = getCartKey(userId);
  localStorage.removeItem(cartKey);
  return [];
};

// Tính tổng tiền giỏ hàng
export const calculateCartTotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => {
    // Lấy giá mặc định là 0 nếu không có giá hoặc không thể chuyển đổi
    const price = item.product?.price ? Number(item.product.price) || 0 : 0;
    return total + (price * item.quantity);
  }, 0);
}; 