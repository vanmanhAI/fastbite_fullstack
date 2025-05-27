"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getProductListBanners, Banner } from "@/services/bannerService"

interface ProductListBannerProps {
  className?: string
}

export default function ProductListBanner({ className = "" }: ProductListBannerProps) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true)
        const data = await getProductListBanners()
        console.log("Product list banners fetched:", data)
        setBanners(data)
      } catch (error) {
        console.error("Lỗi khi tải banner trang sản phẩm:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [])

  if (loading) {
    return (
      <div className={`w-full h-[200px] bg-gray-100 animate-pulse rounded-xl ${className}`}></div>
    )
  }

  if (!banners || banners.length === 0) {
    return null
  }

  // Hiển thị banner đầu tiên
  const banner = banners[0]

  // Tạo background style dựa trên banner
  const backgroundStyle = {
    backgroundColor: banner.backgroundColor || "#f97316", // Default orange color
    color: banner.textColor || "#ffffff" // Default white text
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div 
        className="w-full h-[200px] relative overflow-hidden rounded-xl"
        style={backgroundStyle}
      >
        {/* Background image */}
        {banner.imageUrl && (
          <div className="absolute inset-0 opacity-20">
            <img 
              src={banner.imageUrl} 
              alt={banner.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log("Lỗi tải hình banner:", banner.title, banner.imageUrl);
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder.svg?height=200&width=1200&text=Banner";
              }}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="relative h-full container mx-auto px-6 flex items-center justify-between py-8">
          <div className="md:w-3/4 space-y-3 z-10">
            <h2 className="text-2xl md:text-3xl font-bold">{banner.title}</h2>
            
            {banner.description && (
              <p className="opacity-90 text-sm md:text-base max-w-lg">
                {banner.description}
              </p>
            )}
            
            {banner.buttonText && banner.linkUrl && (
              <div className="mt-4">
                <Link href={banner.linkUrl}>
                  <Button className="bg-white hover:bg-gray-100 text-black">
                    {banner.buttonText}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}