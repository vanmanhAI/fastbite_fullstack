"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Product } from '../services/productService'
import {
  CartItem,
  getCartFromLocalStorage,
  saveCartToLocalStorage,
  calculateCartTotal,
  clearCart as clearCartFromStorage
} from '../services/cartService'
import { useAuth } from "@/contexts/AuthContext"

interface CartContextType {
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  addToCart: (product: Product, quantity?: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeFromCart: (productId: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [cartTotal, setCartTotal] = useState(0)
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id

  // Tải giỏ hàng từ localStorage khi component mount hoặc khi user thay đổi
  useEffect(() => {
    const savedCart = getCartFromLocalStorage(userId)
    setCart(savedCart)
    updateCartStats(savedCart)
  }, [userId])

  // Cập nhật thống kê giỏ hàng (số lượng và tổng tiền)
  const updateCartStats = (cartItems: CartItem[]) => {
    const count = cartItems.reduce((total, item) => total + item.quantity, 0)
    const total = calculateCartTotal(cartItems)
    
    setCartCount(count)
    setCartTotal(total)
  }

  // Thêm sản phẩm vào giỏ hàng
  const addToCart = (product: Product, quantity: number = 1) => {
    const newCart = [...cart]
    const existingItemIndex = newCart.findIndex(item => item.product.id === product.id)
    
    if (existingItemIndex >= 0) {
      newCart[existingItemIndex].quantity += quantity
    } else {
      newCart.push({ product, quantity })
    }
    
    setCart(newCart)
    updateCartStats(newCart)
    saveCartToLocalStorage(newCart, userId)

    toast({
      title: "Đã thêm vào giỏ hàng",
      description: `${product.name} đã được thêm vào giỏ hàng`,
    })
  }

  // Cập nhật số lượng sản phẩm
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    const newCart = cart.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    )
    
    setCart(newCart)
    updateCartStats(newCart)
    saveCartToLocalStorage(newCart, userId)
  }

  // Xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = (productId: number) => {
    const newCart = cart.filter(item => item.product.id !== productId)
    
    setCart(newCart)
    updateCartStats(newCart)
    saveCartToLocalStorage(newCart, userId)

    toast({
      title: "Đã xóa khỏi giỏ hàng",
      description: "Sản phẩm đã được xóa khỏi giỏ hàng",
    })
  }

  // Xóa toàn bộ giỏ hàng
  const clearCart = () => {
    setCart([])
    updateCartStats([])
    clearCartFromStorage(userId)
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