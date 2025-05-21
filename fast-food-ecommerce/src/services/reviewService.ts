import { API_URL } from "@/lib/api-config"

export interface Review {
  id: number
  userId: number
  productId: number
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    name: string
    email: string
  }
}

export interface ReviewResponse {
  message: string
  review: Review
  updated?: boolean
}

// Lấy đánh giá của một sản phẩm
export const getReviewsByProduct = async (
  productId: number
): Promise<{ reviews: Review[], avgRating: number }> => {
  try {
    const response = await fetch(`${API_URL}/products/${productId}/reviews`)

    if (!response.ok) {
      throw new Error("Không thể lấy đánh giá sản phẩm")
    }

    const data = await response.json()
    return {
      reviews: data.reviews,
      avgRating: data.avgRating
    }
  } catch (error) {
    console.error("Lỗi khi lấy đánh giá sản phẩm:", error)
    throw error
  }
}

// Tạo đánh giá mới
export const createReview = async (
  reviewData: { productId: number, rating: number, comment: string },
  token: string
): Promise<ReviewResponse> => {
  try {
    const productId = reviewData.productId;
    const response = await fetch(`${API_URL}/products/${productId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rating: reviewData.rating,
        comment: reviewData.comment
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Không thể tạo đánh giá")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Lỗi khi tạo đánh giá:", error)
    throw error
  }
}

// Cập nhật đánh giá
export const updateReview = async (
  reviewId: number,
  reviewData: { rating?: number, comment?: string },
  token: string
): Promise<Review> => {
  try {
    const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reviewData),
    })

    if (!response.ok) {
      throw new Error("Không thể cập nhật đánh giá")
    }

    const data = await response.json()
    return data.review
  } catch (error) {
    console.error("Lỗi khi cập nhật đánh giá:", error)
    throw error
  }
}

// Xóa đánh giá
export const deleteReview = async (reviewId: number, token: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể xóa đánh giá")
    }
  } catch (error) {
    console.error("Lỗi khi xóa đánh giá:", error)
    throw error
  }
} 