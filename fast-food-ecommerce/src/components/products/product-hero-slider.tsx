"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import useEmblaCarousel from 'embla-carousel-react'
import { formatCurrency } from "@/lib/utils"
import { getProducts } from '@/services/productService'

interface ProductHeroSliderProps {
  className?: string
}

export default function ProductHeroSlider({ className }: ProductHeroSliderProps) {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: true })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  // Lấy sản phẩm nổi bật từ database
  useEffect(() => {
    async function fetchFeaturedProducts() {






      
      try {
        setLoading(true)
        // Lấy 8 sản phẩm nổi bật từ database
        console.log("Đang gọi API lấy sản phẩm nổi bật...")
        const productsResponse = await getProducts(1, 8, undefined, undefined, true)
        console.log("Response API:", productsResponse)
        console.log("Sản phẩm nổi bật:", productsResponse?.data?.length || 0, "sản phẩm")
        
        if (productsResponse?.data && productsResponse.data.length > 0) {
          console.log("Sử dụng dữ liệu sản phẩm từ API")
          setFeaturedProducts(productsResponse.data)
        } else {
          console.log("Không có sản phẩm nổi bật từ API, sử dụng dữ liệu mẫu")
          setFeaturedProducts(sampleProducts)
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu sản phẩm cho slider:", error)
        console.log("Sử dụng dữ liệu mẫu do lỗi API")
        setFeaturedProducts(sampleProducts)
      } finally {
        setLoading(false)
      }
    }
    
    fetchFeaturedProducts()
  }, [])

  // Thiết lập embla carousel
  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi, setSelectedIndex])

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  )

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on("select", onSelect)
    onSelect()

    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, onSelect])

  // Auto play slider
  useEffect(() => {
    if (!emblaApi) return

    const autoplayInterval = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext()
      } else {
        emblaApi.scrollTo(0)
      }
    }, 5000)

    return () => clearInterval(autoplayInterval)
  }, [emblaApi])

  if (loading) {
    return (
      <div className={`w-full bg-gray-100 animate-pulse h-[400px] rounded-xl ${className}`}></div>
    )
  }

  if (featuredProducts.length === 0) {
    return null
  }

  // Tạo gradient khác nhau cho mỗi slide
  const gradients = [
    "from-red-600 to-orange-500",
    "from-blue-600 to-indigo-500",
    "from-green-600 to-emerald-500",
    "from-purple-600 to-pink-500",
    "from-yellow-600 to-amber-500",
  ]

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className="embla overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex">
          {featuredProducts.map((product, index) => (
            <div key={product.id} className="embla__slide min-w-full relative">
              <div className={`w-full h-[400px] bg-gradient-to-r ${gradients[index % gradients.length]} relative overflow-hidden rounded-xl`}>
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Background image */}
                <div className="absolute inset-0 opacity-40">
                  <img 
                    src={product.image_url || product.imageUrl || "/placeholder.svg?height=400&width=800&text=Food"} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log("Lỗi tải hình ảnh:", product.name, product.image_url || product.imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder.svg?height=400&width=800&text=Food";
                    }}
                  />
                </div>
                
                {/* Content */}
                <div className="relative h-full container mx-auto px-6 flex flex-col md:flex-row items-center justify-between py-12">
                  <div className="md:w-1/2 text-white space-y-4 z-10">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2">{product.name}</h2>
                    
                    <p className="text-white/90 text-sm md:text-base mb-4 max-w-md">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-2xl font-bold">{formatCurrency(product.price)}</span>
                      
                      {(product.is_vegetarian || product.isVegetarian) && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          Chay
                        </span>
                      )}
                      
                      {product.tags && typeof product.tags === 'string' && JSON.parse(product.tags).includes("bestseller") && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          Bán chạy
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/products/${product.id}`}>
                        <Button className="bg-white text-black hover:bg-gray-100">
                          Xem chi tiết
                        </Button>
                      </Link>
                      
                      <Link href="/products">
                        <Button variant="outline" className="border-white text-white hover:bg-white/20">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Xem thêm
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="md:w-1/2 hidden md:flex justify-end items-center">
                    <Card className="w-64 h-64 overflow-hidden rounded-full border-4 border-white/30 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                      <img 
                        src={product.image_url || product.imageUrl || "/placeholder.svg?height=300&width=300&text=Food"} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("Lỗi tải hình ảnh (card):", product.name, product.image_url || product.imageUrl);
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/placeholder.svg?height=300&width=300&text=Food";
                        }}
                      />
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Điều hướng */}
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute left-4 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm border-white text-gray-800 shadow-lg hover:bg-white"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute right-4 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm border-white text-gray-800 shadow-lg hover:bg-white"
        onClick={scrollNext}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      {/* Chỉ số trang */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === selectedIndex 
                ? "w-8 bg-white" 
                : "w-2 bg-white/50 hover:bg-white/70"
            }`}
            onClick={() => scrollTo(index)}
          />
        ))}
      </div>
    </div>
  )
}

// Dữ liệu mẫu sản phẩm nổi bật khi API không trả về dữ liệu
const sampleProducts = [
  {
    id: 1,
    name: "Burger Bò Phô Mai",
    description: "Burger thịt bò Úc 100% với phô mai cheddar béo ngậy, rau xà lách tươi và sốt đặc biệt của nhà hàng",
    price: 89000,
    imageUrl: "/placeholder.svg?height=500&width=500&text=Burger"
  },
  {
    id: 2,
    name: "Burger Gà Giòn",
    description: "Burger với miếng gà rán giòn rụm, rau xà lách tươi, cà chua và sốt mayonnaise",
    price: 69000,
    imageUrl: "/placeholder.svg?height=500&width=500&text=Chicken+Burger"
  },
  {
    id: 3,
    name: "Pizza Hải Sản",
    description: "Pizza với hải sản tươi ngon như tôm, mực, cua gạch và phô mai mozzarella",
    price: 159000,
    imageUrl: "/placeholder.svg?height=500&width=500&text=Pizza"
  },
  {
    id: 5,
    name: "Gà Rán Giòn (3 Miếng)",
    description: "Gà rán giòn với lớp bột đặc biệt, chiên vàng giòn rụm",
    price: 129000,
    imageUrl: "/placeholder.svg?height=500&width=500&text=Fried+Chicken"
  },
  {
    id: 10,
    name: "Combo Burger Bò + Khoai Tây + Nước",
    description: "Combo tiết kiệm với burger bò phô mai, khoai tây chiên và coca cola",
    price: 149000,
    imageUrl: "/placeholder.svg?height=500&width=500&text=Combo"
  }
] 