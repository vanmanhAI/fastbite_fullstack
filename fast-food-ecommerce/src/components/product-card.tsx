"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useCart } from "@/contexts/CartContext"
import { Product } from "@/services/productService"
import { useToast } from "@/components/ui/use-toast"
import recommendationService from "@/services/recommendationService"

interface ProductCardProps {
  product: Product
  onAddToCart?: () => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { addToCart } = useCart()
  const { toast } = useToast()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onAddToCart) {
      onAddToCart()
    } else {
      addToCart(product)
      
      // Theo dõi hành vi thêm vào giỏ hàng
      try {
        recommendationService.trackAddToCart(product.id)
        console.log(`Đã gọi trackAddToCart cho sản phẩm ID: ${product.id}`)
      } catch (error) {
        console.error("Lỗi khi theo dõi hành vi thêm vào giỏ hàng:", error)
      }
      
      toast({
        title: "Đã thêm vào giỏ hàng",
        description: `${product.name} đã được thêm vào giỏ hàng`,
        duration: 3000,
      })
    }
  }

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-lg flex flex-col">
        <div className="relative h-48 overflow-hidden">
          <img
            src={product.imageUrl || "/images/placeholder-food.jpg"}
            alt={product.name}
            className="object-cover w-full h-full transform transition-transform duration-300 hover:scale-105"
          />
          {product.isVegetarian && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Chay
            </span>
          )}
        </div>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg font-bold line-clamp-1">{product.name}</CardTitle>
          <p className="text-gray-600 mt-2 text-sm line-clamp-2">{product.description}</p>
          <div className="flex justify-between items-center mt-3">
            <p className="font-bold text-primary">{formatCurrency(product.price)}</p>
            {product.preparationTime && (
              <span className="text-xs text-gray-500">{product.preparationTime} phút</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full"
            onClick={handleAddToCart}
          >
            Thêm vào giỏ
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}

