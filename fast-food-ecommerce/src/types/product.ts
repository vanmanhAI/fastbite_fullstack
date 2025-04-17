export interface Product {
  id: number
  name: string
  description: string
  price: number
  image: string
  category: string
  rating: number
  ratings_count: number
  is_featured: boolean
  is_new: boolean
  is_sale: boolean
  sale_price?: number
  tags?: string[]
}

export interface Category {
  id: number
  name: string
  slug: string
  count: number
  image?: string
}

export interface Review {
  id: number
  user_name: string
  user_image?: string
  rating: number
  comment: string
  created_at: string
  product_id: number
}

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  total: number
}

export interface Order {
  id: number
  user_id: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  total: number
  items: OrderItem[]
  created_at: string
  shipping_address: {
    address: string
    city: string
    postal_code: string
    country: string
  }
  payment_method: 'credit_card' | 'paypal' | 'cash'
  payment_status: 'pending' | 'paid' | 'failed'
}

export interface Promotion {
  id: number
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value?: number
  max_discount_amount?: number
  expiry_date: string
  is_active: boolean
}

