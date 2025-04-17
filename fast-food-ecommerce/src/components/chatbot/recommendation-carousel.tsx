"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useCart } from "@/contexts/CartContext"
import { formatCurrency } from "@/lib/utils"

interface Recommendation {
  id: number
  name: string
  image: string
  price: number
  description?: string
  stock?: number
  category?: string
}

interface RecommendationCarouselProps {
  recommendations: Recommendation[]
}

export default function RecommendationCarousel({
  recommendations
}: RecommendationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { toast } = useToast()
  const { addToCart } = useCart()

  // Reset index khi recommendations thay đổi
  useEffect(() => {
    setCurrentIndex(0)
    console.log(`Carousel đã nhận được ${recommendations.length} sản phẩm`)
  }, [recommendations])

  const nextItem = () => {
    if (recommendations.length <= 1) return
    
    console.log("Next item clicked, current index:", currentIndex, "moving to:", 
      currentIndex === recommendations.length - 1 ? 0 : currentIndex + 1)
      
    setCurrentIndex((prevIndex) => 
      prevIndex === recommendations.length - 1 ? 0 : prevIndex + 1
    )
  }

  const prevItem = () => {
    if (recommendations.length <= 1) return
    
    console.log("Prev item clicked, current index:", currentIndex, "moving to:", 
      currentIndex === 0 ? recommendations.length - 1 : currentIndex - 1)
      
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? recommendations.length - 1 : prevIndex - 1
    )
  }

  const handleAddToCart = (recommendation: Recommendation) => {
    addToCart({
      id: recommendation.id,
      name: recommendation.name,
      price: recommendation.price,
      imageUrl: recommendation.image || "/placeholder.svg",
      description: recommendation.description || "",
      stock: recommendation.stock || 100,
      category: recommendation.category || "Food",
      isVegetarian: false,
      isFeatured: false,
      isActive: true,
      categories: []
    }, 1)

    toast({
      title: "Đã thêm vào giỏ hàng",
      description: `${recommendation.name} đã được thêm vào giỏ hàng của bạn.`,
      duration: 2000
    })
  }

  if (!recommendations.length) return null

  // Đảm bảo currentIndex trong khoảng phù hợp
  const safeIndex = Math.min(currentIndex, recommendations.length - 1)
  const currentItem = recommendations[safeIndex]

  return (
    <div className="w-full mb-2">
      <h3 className="text-sm font-medium mb-2">
        Gợi ý cho bạn {recommendations.length > 1 ? `(${safeIndex + 1}/${recommendations.length})` : ''}:
      </h3>
      <Card className="relative border shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm truncate">{currentItem.name}</h4>
            <p className="font-medium text-sm text-red-600">{formatCurrency(currentItem.price)}</p>
          </div>
          
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md mb-2">
            <Image
              src={currentItem.image || "/placeholder.svg"}
              alt={currentItem.name}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
              onError={(e) => {
                console.warn("Image failed to load:", currentItem.image)
                // Fallback khi ảnh bị lỗi
                ;(e.target as HTMLImageElement).src = "/placeholder.svg"
              }}
            />
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 h-8">
            {currentItem.description || `${currentItem.name} - món ngon từ FastBite`}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-full border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={prevItem}
                disabled={recommendations.length <= 1}
                title="Món trước đó"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-full border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={nextItem}
                disabled={recommendations.length <= 1}
                title="Món tiếp theo"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              size="sm" 
              onClick={() => handleAddToCart(currentItem)}
              className="h-7 text-xs bg-red-600 hover:bg-red-700"
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              Thêm vào giỏ
            </Button>
          </div>
          
          {recommendations.length > 1 && (
            <div className="flex justify-center mt-2 gap-1">
              {recommendations.map((_, index) => (
                <button
                  key={index}
                  className={`h-1.5 rounded-full ${
                    safeIndex === index ? "w-3 bg-red-600" : "w-1.5 bg-gray-300 dark:bg-gray-700"
                  }`}
                  onClick={() => setCurrentIndex(index)}
                  title={`Món ${index + 1}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

