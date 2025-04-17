import { API_URL } from "@/lib/api-config"
import { CartItem } from "@/contexts/CartContext"

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  productName: string
  price: number
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: number
  userId: number
  deliveryAddressId: number
  deliveryAddress: string
  status: string
  paymentMethod: string
  paymentStatus: string
  totalAmount: number
  notes: string
  discountAmount: number
  couponCode: string
  createdAt: string
  updatedAt: string
  orderItems: OrderItem[]
}

// Chuyển đổi giỏ hàng thành đơn hàng
export const cartToOrderItems = (cart: CartItem[]) => {
  return cart.map(item => ({
    productId: item.product.id,
    quantity: item.quantity
  }))
}

// Tạo đơn hàng mới
export const createOrder = async (
  orderData: {
    deliveryAddressId: number,
    paymentMethod: string,
    items: { productId: number, quantity: number }[],
    notes?: string,
    couponCode?: string,
    discountAmount?: number
  },
  token: string
): Promise<Order> => {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể tạo đơn hàng")
    }

    const data = await response.json()
    return data.order
  } catch (error) {
    console.error("Lỗi khi tạo đơn hàng:", error)
    throw error
  }
}

// Lấy danh sách đơn hàng của người dùng
export const getUserOrders = async (
  page: number = 1,
  limit: number = 10
): Promise<{ orders: Order[], pagination: { page: number, totalPages: number, total: number } }> => {
  try {
    const response = await fetch(`${API_URL}/orders?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể lấy danh sách đơn hàng")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error)
    throw error
  }
}

// Lấy thông tin đơn hàng theo ID
export const getOrderById = async (id: number, token: string): Promise<Order> => {
  try {
    const response = await fetch(`${API_URL}/orders/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể lấy thông tin đơn hàng")
    }

    const data = await response.json()
    return data.order
  } catch (error) {
    console.error("Lỗi khi lấy thông tin đơn hàng:", error)
    throw error
  }
}

// Hủy đơn hàng
export const cancelOrder = async (id: number, token: string): Promise<Order> => {
  try {
    const response = await fetch(`${API_URL}/orders/${id}/cancel`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể hủy đơn hàng")
    }

    const data = await response.json()
    return data.order
  } catch (error) {
    console.error("Lỗi khi hủy đơn hàng:", error)
    throw error
  }
} 