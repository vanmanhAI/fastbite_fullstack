"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { getProducts } from '@/services/productService'
import LoadingSpinner from '@/components/loading-spinner'

interface ProductBannerProps {
  className?: string
}

export default function ProductBanner({ className }: ProductBannerProps) {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        setLoading(true)
        // Lấy 5 sản phẩm nổi bật từ database
        const productsResponse = await getProducts(1, 5, undefined, undefined, true)
        console.log("Sản phẩm nổi bật:", productsResponse?.data?.length || 0, "sản phẩm")
        
        // Đảm bảo có dữ liệu
        if (productsResponse?.data && productsResponse.data.length > 0) {
          setFeaturedProducts(productsResponse.data)
        } else {
          // Sử dụng dữ liệu mẫu nếu không có dữ liệu từ API
          setFeaturedProducts(sampleProducts)
          console.log("Sử dụng dữ liệu mẫu cho banner sản phẩm")
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu sản phẩm:", error)
        // Sử dụng dữ liệu mẫu trong trường hợp lỗi
        setFeaturedProducts(sampleProducts)
        console.log("Sử dụng dữ liệu mẫu cho banner sản phẩm do lỗi")
      } finally {
        setLoading(false)
      }
    }
    
    fetchFeaturedProducts()
  }, [])

  if (loading) {
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>
  }

  if (featuredProducts.length === 0) {
    return null
  }

  // Đảm bảo có ít nhất 5 sản phẩm để hiển thị
  const displayProducts = featuredProducts.length < 5 
    ? [...featuredProducts, ...sampleProducts.slice(0, 5 - featuredProducts.length)]
    : featuredProducts.slice(0, 5)

  return (
    <section className={`bg-gradient-to-r from-red-600 to-amber-500 py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Món Ăn Đặc Sắc</h2>
        
        <div className="relative overflow-hidden">
          {/* Banner chính với sản phẩm nổi bật đầu tiên */}
          <div className="flex flex-col md:flex-row items-center mb-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
              <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">
                {displayProducts[0].name}
              </h3>
              <p className="text-white/80 mb-6">
                {displayProducts[0].description}
              </p>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold text-white">
                  {formatCurrency(displayProducts[0].price)}
                </span>
                {displayProducts[0].oldPrice && (
                  <span className="text-xl text-white/70 line-through">
                    {formatCurrency(displayProducts[0].oldPrice)}
                  </span>
                )}
              </div>
              <Link href={`/products/${displayProducts[0].id}`}>
                <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100">
                  Đặt ngay
                </Button>
              </Link>
            </div>
            <div className="md:w-1/2">
              <div className="relative aspect-square max-w-[500px] mx-auto">
                <img
                  src={displayProducts[0].image_url || "/placeholder.svg?height=500&width=500&text=Food+Product"}
                  alt={displayProducts[0].name}
                  className="rounded-xl object-cover w-full h-full shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/placeholder.svg?height=500&width=500&text=Food+Product";
                  }}
                />
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-sm font-bold px-3 py-1 rounded-full">
                  HOT
                </div>
              </div>
            </div>
          </div>

          {/* Sản phẩm khác */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayProducts.slice(1, 5).map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-white/20 bg-white/10 backdrop-blur-sm">
                <Link href={`/products/${product.id}`}>
                  <div className="relative aspect-square">
                    <img
                      src={product.image_url || "/placeholder.svg?height=300&width=300&text=Food"}
                      alt={product.name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "/placeholder.svg?height=300&width=300&text=Food";
                      }}
                    />
                  </div>
                  <div className="p-4 text-white">
                    <h4 className="font-bold mb-2 truncate">{product.name}</h4>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{formatCurrency(product.price)}</span>
                      <Button size="sm" variant="outline" className="border-white text-white hover:bg-white/20">
                        Xem
                      </Button>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Dữ liệu mẫu để sử dụng khi không có dữ liệu từ API
const sampleProducts = [
  {
    id: 1,
    name: "Burger Bò Phô Mai",
    description: "Burger thịt bò Úc 100% với phô mai cheddar béo ngậy, rau xà lách tươi và sốt đặc biệt của nhà hàng",
    price: 89000,
    image_url: "/placeholder.svg?height=500&width=500&text=Burger"
  },
  {
    id: 2,
    name: "Burger Gà Giòn",
    description: "Burger với miếng gà rán giòn rụm, rau xà lách tươi, cà chua và sốt mayonnaise",
    price: 69000,
    image_url: "/placeholder.svg?height=300&width=300&text=Chicken+Burger"
  },
  {
    id: 3,
    name: "Pizza Hải Sản",
    description: "Pizza với hải sản tươi ngon như tôm, mực, cua gạch và phô mai mozzarella",
    price: 159000,
    image_url: "/placeholder.svg?height=300&width=300&text=Pizza"
  },
  {
    id: 4,
    name: "Pizza Rau Củ",
    description: "Pizza chay với nhiều loại rau củ như ớt chuông, nấm, oliu, hành tây và phô mai mozzarella",
    price: 139000,
    image_url: "/placeholder.svg?height=300&width=300&text=Veggie+Pizza"
  },
  {
    id: 5,
    name: "Gà Rán (3 Miếng)",
    description: "Gà rán giòn với lớp bột đặc biệt, chiên vàng giòn rụm",
    price: 129000,
    image_url: "/placeholder.svg?height=300&width=300&text=Fried+Chicken"
  }
] 