"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getProductById, Product } from '@/services/productService'
import { getReviewsByProduct, Review } from '@/services/reviewService'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import {
  Clock,
  Flame,
  Heart,
  Leaf,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import ProductReviews from '@/components/product-reviews'
import { useToast } from '@/components/ui/use-toast'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const { addToCart } = useCart()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true)
        const productData = await getProductById(Number(id))
        setProduct(productData)
        
        // Lấy đánh giá
        const reviewsData = await getReviewsByProduct(Number(id))
        setReviews(reviewsData.reviews)
        
        // Tính điểm trung bình
        if (reviewsData.reviews.length > 0) {
          const totalRating = reviewsData.reviews.reduce(
            (sum, review) => sum + review.rating, 0
          )
          setAvgRating(totalRating / reviewsData.reviews.length)
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin sản phẩm:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProductDetails()
    }
  }, [id])

  const handleIncreaseQuantity = () => setQuantity(prev => prev + 1)
  
  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1)
    }
  }

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity)
      toast({
        title: "Đã thêm vào giỏ hàng",
        description: `${quantity} x ${product.name} đã được thêm vào giỏ hàng`,
        duration: 3000,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Sản phẩm không tồn tại</h2>
        <p className="mb-8">Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
        <Link href="/products">
          <Button>Quay lại danh sách sản phẩm</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Product Image */}
        <div className="w-full md:w-1/2">
          <div className="rounded-lg overflow-hidden">
            <img 
              src={product.imageUrl || "/images/placeholder-food.jpg"} 
              alt={product.name}
              className="w-full object-cover aspect-square"
            />
          </div>
        </div>
        
        {/* Product Info */}
        <div className="w-full md:w-1/2">
          <div className="flex flex-wrap gap-2 mb-4">
            {product.categories?.map((category) => (
              <Link 
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="text-sm px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                {category.name}
              </Link>
            ))}
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(avgRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              ({reviews.length} đánh giá)
            </span>
          </div>
          
          <p className="text-2xl font-bold text-primary mb-4">
            {formatCurrency(product.price)}
          </p>
          
          <p className="text-gray-700 mb-6">{product.description}</p>
          
          <div className="flex flex-wrap gap-4 mb-6">
            {product.preparationTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{product.preparationTime} phút</span>
              </div>
            )}
            
            {product.calories && (
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{product.calories} calo</span>
              </div>
            )}
            
            {product.isVegetarian && (
              <div className="flex items-center gap-1">
                <Leaf className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500">Món chay</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDecreaseQuantity}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleIncreaseQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              className="flex-1"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Thêm vào giỏ
            </Button>
            
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">Tình trạng:</p>
                  <p className="text-sm font-medium">Danh mục:</p>
                  {product.tags && <p className="text-sm font-medium">Tags:</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
                  </p>
                  <p className="text-sm">
                    {product.categories?.map(c => c.name).join(', ')}
                  </p>
                  {product.tags && (
                    <p className="text-sm">{product.tags}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Product Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full">
            <TabsTrigger value="description" className="flex-1">Thông tin sản phẩm</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">Đánh giá ({reviews.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="description" className="p-4">
            <div className="prose max-w-none">
              {product.description ? (
                <div dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <p>Không có thông tin chi tiết về sản phẩm này.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="reviews">
            <ProductReviews 
              reviews={reviews} 
              productId={product.id} 
              avgRating={avgRating}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

