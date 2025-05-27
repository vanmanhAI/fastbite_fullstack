"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import useEmblaCarousel from 'embla-carousel-react'
import { getProductListBanners, Banner } from "@/services/bannerService"

interface ProductHeroSliderProps {
  className?: string
}

export default function ProductHeroSlider({ className }: ProductHeroSliderProps) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: true })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  // Lấy banner từ database
  useEffect(() => {
    async function fetchBanners() {
      try {
        setLoading(true)
        console.log("Đang gọi API lấy banner trang sản phẩm...")
        const data = await getProductListBanners()
        console.log("Banner nhận được:", data?.length || 0, "banner")
        
        if (data && data.length > 0) {
          console.log("Sử dụng dữ liệu banner từ API")
          setBanners(data)
        } else {
          console.log("Không có banner từ API")
          setBanners([])
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu banner cho slider:", error)
        setBanners([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchBanners()
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

  if (banners.length === 0) {
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
          {banners.map((banner, index) => (
            <div key={banner.id} className="embla__slide min-w-full relative">
              <div className={`w-full h-[400px] bg-gradient-to-r ${gradients[index % gradients.length]} relative overflow-hidden rounded-xl`}
                   style={{
                     backgroundColor: banner.backgroundColor || undefined,
                     color: banner.textColor || "#ffffff"
                   }}>
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Background image */}
                <div className="absolute inset-0 opacity-40">
                  <img 
                    src={banner.imageUrl || "/placeholder.svg?height=400&width=800&text=Banner"} 
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log("Lỗi tải hình ảnh banner:", banner.title, banner.imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder.svg?height=400&width=800&text=Banner";
                    }}
                  />
                </div>
                
                {/* Content */}
                <div className="relative h-full container mx-auto px-6 flex flex-col md:flex-row items-center justify-between py-12">
                  <div className="md:w-1/2 text-white space-y-4 z-10">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2">{banner.title}</h2>
                    
                    <p className="text-white/90 text-sm md:text-base mb-4 max-w-md">
                      {banner.description || ""}
                    </p>
                    
                    {banner.buttonText && banner.linkUrl && (
                      <div className="flex flex-wrap gap-3 mt-6">
                        <Link href={banner.linkUrl}>
                          <Button className="bg-white text-black hover:bg-gray-100">
                            {banner.buttonText}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  <div className="md:w-1/2 hidden md:flex justify-end items-center">
                    <Card className="w-64 h-64 overflow-hidden rounded-full border-4 border-white/30 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                      <img 
                        src={banner.imageUrl || "/placeholder.svg?height=300&width=300&text=Banner"} 
                        alt={banner.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("Lỗi tải hình ảnh banner (card):", banner.title, banner.imageUrl);
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/placeholder.svg?height=300&width=300&text=Banner";
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