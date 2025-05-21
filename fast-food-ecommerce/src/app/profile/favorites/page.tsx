"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getLikedProducts } from "@/services/productService"
import { useAuth } from "@/contexts/AuthContext"
import { Product } from "@/services/productService"
import ProductCard from "@/components/products/product-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import LoadingSpinner from "@/components/loading-spinner"

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchLikedProducts = async () => {
      if (!isAuthenticated) {
        router.push("/login?redirect=/profile/favorites")
        return
      }

      try {
        setLoading(true)
        const likedProducts = await getLikedProducts()
        setProducts(likedProducts)
      } catch (error) {
        console.error("Không thể tải danh sách sản phẩm yêu thích:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLikedProducts()
  }, [isAuthenticated, router])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Sản phẩm yêu thích</h1>

      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="favorites" className="flex-1">
            <Heart className="mr-2 h-4 w-4" />
            Sản phẩm yêu thích
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Chưa có sản phẩm yêu thích</h3>
              <p className="text-gray-500 mb-6">
                Bạn chưa thích sản phẩm nào. Hãy khám phá các sản phẩm và thêm vào danh sách yêu thích của bạn!
              </p>
              <Button onClick={() => router.push('/products')}>
                Khám phá sản phẩm
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 