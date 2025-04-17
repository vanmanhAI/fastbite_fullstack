"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Review, createReview } from "@/services/reviewService"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from "@/components/ui/card"
import { Star, StarIcon } from 'lucide-react'

interface ProductReviewsProps {
  reviews: Review[]
  productId: number
  avgRating: number
}

export default function ProductReviews({ reviews, productId, avgRating }: ProductReviewsProps) {
  const { isAuthenticated, token } = useAuth()
  const { toast } = useToast()
  const [comment, setComment] = useState("")
  const [rating, setRating] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRatingChange = (newRating: number) => {
    setRating(newRating)
  }

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Đăng nhập để đánh giá",
        description: "Bạn cần đăng nhập để có thể đánh giá sản phẩm.",
        variant: "destructive"
      })
      return
    }

    if (!comment.trim()) {
      toast({
        title: "Nội dung đánh giá trống",
        description: "Vui lòng nhập nội dung đánh giá.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      await createReview({
        productId,
        rating,
        comment,
      }, token)

      toast({
        title: "Đánh giá thành công",
        description: "Cảm ơn bạn đã đánh giá sản phẩm."
      })

      // Reset form
      setComment("")
      setRating(5)

      // Reload trang để hiển thị đánh giá mới
      window.location.reload()
    } catch (error) {
      console.error("Lỗi khi gửi đánh giá:", error)
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi gửi đánh giá.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-4">
      {/* Average Rating */}
      <div className="flex items-center mb-6">
        <div className="bg-yellow-100 p-4 rounded-lg flex items-center space-x-4 w-full">
          <div className="text-3xl font-bold text-yellow-500">{avgRating.toFixed(1)}</div>
          <div>
            <div className="flex space-x-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i < Math.round(avgRating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">{reviews.length} đánh giá</p>
          </div>
        </div>
      </div>

      {/* Write a Review */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-bold">Viết đánh giá</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Đánh giá của bạn</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nội dung đánh giá</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Hãy cho chúng tôi biết cảm nhận của bạn về sản phẩm này..."
                rows={4}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmitReview} 
            disabled={isSubmitting || !isAuthenticated}
          >
            {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
          </Button>
          {!isAuthenticated && (
            <p className="text-sm text-gray-500 ml-4">
              Bạn cần <Link href="/login" className="text-primary">đăng nhập</Link> để đánh giá
            </p>
          )}
        </CardFooter>
      </Card>

      {/* Review List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Đánh giá từ khách hàng</h3>
          {reviews.map((review) => (
            <Card key={review.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div className="font-medium">{review.user?.name || "Khách hàng"}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className="flex space-x-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-gray-700">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">Chưa có đánh giá nào cho sản phẩm này.</p>
      )}
    </div>
  )
} 