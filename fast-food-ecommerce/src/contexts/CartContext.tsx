"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Product } from '../services/productService'
import {
  CartItem,
  getCartFromLocalStorage,
  saveCartToLocalStorage,
  calculateCartTotal,
  clearCart as clearCartFromStorage,
  CartService
} from '../services/cartService'
import { useAuth } from "@/contexts/AuthContext"
import axios from "axios"
import { API_URL } from "@/lib/constants"
import { isTokenValid, refreshIfNeeded } from "@/lib/auth"

interface CartContextType {
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  addToCart: (product: Product, quantity?: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeFromCart: (productId: number) => void
  clearCart: () => void
  syncLocalCartWithServer: () => Promise<void>
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [cartTotal, setCartTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id
  
  // Tạo instance của CartService
  const cartService = CartService.getInstance()

  // Tải giỏ hàng khi component mount hoặc khi user thay đổi
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true)
      try {
        console.log('CartContext: Loading cart - Auth status:', isAuthenticated ? 'Logged in' : 'Guest')
        
        // Thử làm mới token nếu đã đăng nhập
        if (isAuthenticated) {
          console.log('CartContext: Attempting to refresh token if needed');
          await refreshIfNeeded();
        }
        
        // Kiểm tra token hợp lệ
        const tokenValid = isTokenValid();
        console.log('CartContext: Token valid:', tokenValid);
        
        if (isAuthenticated && userId) {
          if (tokenValid) {
            console.log('CartContext: User is authenticated, fetching server cart')
            // Nếu đã đăng nhập, lấy giỏ hàng từ server
            try {
              const serverCart = await cartService.getCart()
              console.log('CartContext: Server cart loaded:', serverCart.length, 'items')
              
              // Kiểm tra nếu có giỏ hàng guest, thì đồng bộ lên server
              const guestCart = getCartFromLocalStorage()
              if (guestCart.length > 0) {
                console.log('CartContext: Found guest cart with', guestCart.length, 'items, syncing to server')
                await syncGuestCartToServer(guestCart)
                // Sau khi đồng bộ, xóa giỏ hàng khách
                clearCartFromStorage()
                // Tải lại giỏ hàng từ server để có dữ liệu mới nhất
                const updatedCart = await cartService.getCart()
                setCart(updatedCart)
                updateCartStats(updatedCart)
              } else {
                setCart(serverCart)
                updateCartStats(serverCart)
              }
            } catch (error) {
              console.error('CartContext: Error getting server cart:', error)
              handleCartLoadingError();
            }
          } else {
            console.log('CartContext: User is authenticated but token is invalid, using localStorage cart');
            const guestCart = getCartFromLocalStorage();
            setCart(guestCart);
            updateCartStats(guestCart);
          }
        } else {
          // Nếu chưa đăng nhập hoặc token không hợp lệ, sử dụng giỏ hàng từ localStorage
          console.log('CartContext: User is guest or token invalid, using localStorage cart')
          const guestCart = getCartFromLocalStorage()
          console.log('CartContext: Loaded', guestCart.length, 'items from localStorage')
          setCart(guestCart)
          updateCartStats(guestCart)
        }
      } catch (error) {
        console.error("CartContext: Lỗi khi tải giỏ hàng:", error)
        handleCartLoadingError();
      } finally {
        setIsLoading(false)
      }
    }
    
    loadCart()
  }, [userId, isAuthenticated])

  // Xử lý lỗi khi tải giỏ hàng
  const handleCartLoadingError = () => {
    // Sử dụng giỏ hàng từ localStorage như biện pháp dự phòng
    const guestCart = getCartFromLocalStorage()
    if (guestCart.length > 0) {
      console.log('CartContext: Using local cart as fallback:', guestCart.length, 'items')
      setCart(guestCart)
      updateCartStats(guestCart)
    }
    
    toast({
      title: "Lỗi tải giỏ hàng",
      description: "Không thể tải thông tin giỏ hàng từ server, đang sử dụng phiên bản cục bộ.",
      variant: "destructive",
    })
  }

  // Đồng bộ giỏ hàng khách lên server khi đăng nhập
  const syncGuestCartToServer = async (guestCart: CartItem[]): Promise<boolean> => {
    if (!isAuthenticated || !userId) {
      console.log('CartContext: Cannot sync - user not authenticated')
      return false
    }
    
    if (guestCart.length === 0) {
      console.log('CartContext: No guest cart to sync')
      return true
    }
      
    try {
      console.log('CartContext: Syncing', guestCart.length, 'items to server')
      const success = await cartService.syncLocalCartToServer(guestCart)
      if (success) {
        console.log('CartContext: Sync successful')
        toast({
          title: "Đồng bộ thành công",
          description: "Giỏ hàng của bạn đã được đồng bộ với tài khoản.",
        })
      } else {
        console.log('CartContext: Sync returned false')
      }
      return success
    } catch (error) {
      console.error("CartContext: Lỗi khi đồng bộ giỏ hàng:", error)
      toast({
        title: "Lỗi đồng bộ",
        description: "Không thể đồng bộ giỏ hàng, vui lòng thử lại sau.",
        variant: "destructive",
      })
      return false
    }
  }

  // Đồng bộ giỏ hàng local với server 
  const syncLocalCartWithServer = async (): Promise<void> => {
    const tokenValid = isAuthenticated && isTokenValid();
    
    if (!tokenValid || !userId) {
      console.log('CartContext: syncLocalCartWithServer - Not authenticated or token invalid');
      return Promise.resolve();
    }
    
    console.log('CartContext: syncLocalCartWithServer - Syncing cart with server');
    setIsLoading(true);
    
    try {
      const serverCart = await cartService.getCart();
      console.log('CartContext: syncLocalCartWithServer - Got server cart with', serverCart.length, 'items');
      setCart(serverCart);
      updateCartStats(serverCart);
    } catch (error) {
      console.error("CartContext: Error syncing cart with server:", error);
      toast({
        title: "Lỗi đồng bộ",
        description: "Không thể đồng bộ giỏ hàng với server. Sử dụng phiên bản cục bộ.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Cập nhật thống kê giỏ hàng (số lượng và tổng tiền)
  const updateCartStats = (cartItems: CartItem[]) => {
    const count = cartItems.reduce((total, item) => total + item.quantity, 0)
    const total = calculateCartTotal(cartItems)
    
    setCartCount(count)
    setCartTotal(total)
  }

  // Thêm sản phẩm vào giỏ hàng
  const addToCart = async (product: Product, quantity: number = 1) => {
    // Kiểm tra tồn kho trước khi thêm vào giỏ
    if (quantity <= 0) {
      toast({
        title: "Số lượng không hợp lệ",
        description: "Số lượng sản phẩm phải lớn hơn 0",
      })
      return
    }
    
    if (quantity > product.stock) {
      toast({
        title: "Vượt quá tồn kho",
        description: `Chỉ còn ${product.stock} sản phẩm trong kho.`,
      })
      quantity = product.stock
    }
    
    try {
      setIsLoading(true)
      
      // Kiểm tra xác thực và token hợp lệ
      const tokenValid = isAuthenticated && isTokenValid();
      
      if (tokenValid && userId) {
        console.log('CartContext: addToCart - User is authenticated with valid token');
        // Đã đăng nhập với token hợp lệ - sử dụng API
        try {
          const cartService = CartService.getInstance();
          await cartService.addToCart(product.id, quantity)
          // Tải lại giỏ hàng từ server
          const updatedCart = await cartService.getCart()
          setCart(updatedCart)
          updateCartStats(updatedCart)
        } catch (error) {
          console.error('CartContext: Error adding to server cart:', error);
          // Nếu lỗi khi thêm vào server, thử thêm vào localStorage
          addToLocalCart(product, quantity);
        }
      } else {
        // Chưa đăng nhập hoặc token không hợp lệ - sử dụng localStorage
        console.log('CartContext: addToCart - Using localStorage (not authenticated or token invalid)');
        addToLocalCart(product, quantity);
      }
      
      toast({
        title: "Đã thêm vào giỏ hàng",
        description: `${product.name} đã được thêm vào giỏ hàng`,
      })
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Hàm thêm sản phẩm vào localStorage
  const addToLocalCart = async (product: Product, quantity: number) => {
    try {
      // Gửi request tới API guest cart để kiểm tra tồn kho
      const response = await axios.post(`${API_URL}/cart/guest/add`, {
        productId: product.id,
        quantity
      });
      
      // Nếu API trả về thành công, cập nhật localStorage
      if (response.data.success) {
        const guestCart = getCartFromLocalStorage()
        const existingItemIndex = guestCart.findIndex(item => item.product.id === product.id)
        
        if (existingItemIndex >= 0) {
          // Tính toán số lượng mới
          const newQuantity = guestCart[existingItemIndex].quantity + quantity
          
          // Kiểm tra tồn kho
          if (newQuantity > product.stock) {
            toast({
              title: "Vượt quá tồn kho",
              description: `Chỉ còn ${product.stock} sản phẩm trong kho.`,
            })
            // Cập nhật số lượng bằng tồn kho tối đa
            guestCart[existingItemIndex].quantity = product.stock
          } else {
            guestCart[existingItemIndex].quantity = newQuantity
          }
        } else {
          // Thêm mới vào giỏ hàng khách
          guestCart.push({ 
            id: Math.random(), // Tạm thời dùng ID ngẫu nhiên
            productId: product.id,
            userId: 0, // Guest user
            quantity,
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              description: product.description || "",
              image: product.imageUrl || "",
              stock: product.stock
            }
          })
        }
        
        setCart(guestCart)
        updateCartStats(guestCart)
        saveCartToLocalStorage(guestCart)
      }
    } catch (error) {
      console.error('Lỗi khi thêm sản phẩm vào giỏ hàng khách:', error)
      
      // Fallback: Vẫn thêm vào giỏ hàng local nếu API lỗi
      const guestCart = getCartFromLocalStorage()
      const existingItemIndex = guestCart.findIndex(item => item.product.id === product.id)
      
      if (existingItemIndex >= 0) {
        guestCart[existingItemIndex].quantity += quantity
      } else {
        guestCart.push({ 
          id: Math.random(),
          productId: product.id, 
          userId: 0,
          quantity,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description || "",
            image: product.imageUrl || "",
            stock: product.stock
          }
        })
      }
      
      setCart(guestCart)
      updateCartStats(guestCart)
      saveCartToLocalStorage(guestCart)
    }
  }

  // Cập nhật số lượng sản phẩm
  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    try {
      setIsLoading(true)
      
      // Kiểm tra xác thực và token hợp lệ
      const tokenValid = isAuthenticated && isTokenValid();
      
      if (tokenValid && userId) {
        console.log('CartContext: updateQuantity - User is authenticated with valid token');
        // Đã đăng nhập với token hợp lệ - sử dụng API
        try {
          await cartService.updateQuantity(productId, quantity)
          // Tải lại giỏ hàng từ server
          const updatedCart = await cartService.getCart()
          setCart(updatedCart)
          updateCartStats(updatedCart)
        } catch (error) {
          console.error('CartContext: Error updating server cart:', error);
          // Nếu lỗi khi cập nhật trên server, thử cập nhật localStorage
          updateLocalCart(productId, quantity);
        }
      } else {
        // Chưa đăng nhập hoặc token không hợp lệ - sử dụng localStorage
        console.log('CartContext: updateQuantity - Using localStorage (not authenticated or token invalid)');
        updateLocalCart(productId, quantity);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật số lượng:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật số lượng sản phẩm. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Hàm cập nhật số lượng trong localStorage
  const updateLocalCart = (productId: number, quantity: number) => {
    const guestCart = getCartFromLocalStorage()
    const productItem = guestCart.find(item => item.product.id === productId)
    
    if (!productItem) return
    
    // Kiểm tra tồn kho
    if (quantity > productItem.product.stock) {
      toast({
        title: "Vượt quá tồn kho",
        description: `Chỉ còn ${productItem.product.stock} sản phẩm trong kho.`,
      })
      quantity = productItem.product.stock
    }
    
    const updatedGuestCart = guestCart.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    )
    
    setCart(updatedGuestCart)
    updateCartStats(updatedGuestCart)
    saveCartToLocalStorage(updatedGuestCart)
  }

  // Xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = async (productId: number) => {
    try {
      setIsLoading(true)
      
      // Kiểm tra xác thực và token hợp lệ
      const tokenValid = isAuthenticated && isTokenValid();
      
      if (tokenValid && userId) {
        console.log('CartContext: removeFromCart - User is authenticated with valid token');
        // Đã đăng nhập với token hợp lệ - sử dụng API
        try {
          await cartService.removeFromCart(productId)
          // Tải lại giỏ hàng từ server
          const updatedCart = await cartService.getCart()
          setCart(updatedCart)
          updateCartStats(updatedCart)
        } catch (error) {
          console.error('CartContext: Error removing from server cart:', error);
          // Nếu lỗi khi xóa trên server, thử xóa từ localStorage
          removeFromLocalCart(productId);
        }
      } else {
        // Chưa đăng nhập hoặc token không hợp lệ - sử dụng localStorage
        console.log('CartContext: removeFromCart - Using localStorage (not authenticated or token invalid)');
        removeFromLocalCart(productId);
      }
      
      toast({
        title: "Đã xóa khỏi giỏ hàng",
        description: "Sản phẩm đã được xóa khỏi giỏ hàng",
      })
    } catch (error) {
      console.error('Lỗi khi xóa sản phẩm:', error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa sản phẩm khỏi giỏ hàng. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Hàm xóa sản phẩm từ localStorage
  const removeFromLocalCart = (productId: number) => {
    const guestCart = getCartFromLocalStorage()
    const updatedGuestCart = guestCart.filter(item => item.product.id !== productId)
    
    setCart(updatedGuestCart)
    updateCartStats(updatedGuestCart)
    saveCartToLocalStorage(updatedGuestCart)
  }

  // Xóa toàn bộ giỏ hàng
  const clearCart = async () => {
    try {
      setIsLoading(true)
      
      // Kiểm tra xác thực và token hợp lệ
      const tokenValid = isAuthenticated && isTokenValid();
      
      if (tokenValid && userId) {
        console.log('CartContext: clearCart - User is authenticated with valid token');
        // Đã đăng nhập với token hợp lệ - sử dụng API
        try {
          await cartService.clearCart()
          setCart([])
          updateCartStats([])
        } catch (error) {
          console.error('CartContext: Error clearing server cart:', error);
          // Nếu lỗi khi xóa trên server, xóa localStorage
          clearLocalCart();
        }
      } else {
        // Chưa đăng nhập hoặc token không hợp lệ - sử dụng localStorage
        console.log('CartContext: clearCart - Using localStorage (not authenticated or token invalid)');
        clearLocalCart();
      }
      
      toast({
        title: "Đã xóa giỏ hàng",
        description: "Giỏ hàng đã được xóa hoàn toàn",
      })
    } catch (error) {
      console.error('Lỗi khi xóa giỏ hàng:', error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa giỏ hàng. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Hàm xóa toàn bộ giỏ hàng trong localStorage
  const clearLocalCart = () => {
    clearCartFromStorage()
    setCart([])
    updateCartStats([])
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        syncLocalCartWithServer,
        isLoading
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
} 