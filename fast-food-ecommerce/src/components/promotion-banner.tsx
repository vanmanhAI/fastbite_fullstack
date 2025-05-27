"use client"

import { Promotion } from "@/services/promotionService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { CalendarIcon, Clock } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import bannerService, { Banner } from "@/services/bannerService"
import LoadingSpinner from '@/components/loading-spinner'

interface PromotionBannerProps {
  promotions: Promotion[]
}

export default function PromotionBanner({ promotions = [] }: PromotionBannerProps) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBanners() {
      try {
        setLoading(true)
        const data = await bannerService.getPromotionBanners()
        setBanners(data)
      } catch (error) {
        console.error("Lỗi khi tải banner khuyến mãi:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [])

  if (loading) {
    return <div className="flex justify-center p-6"><LoadingSpinner /></div>
  }

  // Ưu tiên hiển thị banner từ API
  if (banners.length > 0) {
    return (
      <section className="bg-gradient-to-r from-purple-700 to-indigo-900 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Khuyến mãi đặc biệt</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <Card key={banner.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="relative h-40 bg-gradient-to-r from-orange-500 to-red-600 p-6 flex items-center justify-center"
                  style={{ 
                    backgroundColor: banner.backgroundColor || undefined,
                    background: banner.backgroundColor ? undefined : 'linear-gradient(to right, #f97316, #dc2626)'
                  }}>
                  <div className="text-center" style={{ color: banner.textColor || 'white' }}>
                    <h3 className="text-3xl font-bold">{banner.title}</h3>
                    {banner.description && <p className="text-lg">{banner.description}</p>}
                  </div>
                </div>
                
                <CardContent className="p-4">
                  {banner.startDate && banner.endDate && (
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      <span>
                        Từ {new Date(banner.startDate).toLocaleDateString('vi-VN')} 
                        đến {new Date(banner.endDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="p-4 pt-0">
                  <Link href={banner.linkUrl || "/products"}>
                    <Button className="w-full">{banner.buttonText || "Xem ngay"}</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Sử dụng promotion data khi không có banner
  if (promotions.length === 0) {
    return null
  }

  return (
    <section className="bg-gradient-to-r from-purple-700 to-indigo-900 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Khuyến mãi đặc biệt</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promotion) => {
            // Format dates
            const startDate = new Date(promotion.startDate).toLocaleDateString('vi-VN')
            const endDate = new Date(promotion.endDate).toLocaleDateString('vi-VN')
            
            // Format discount
            const discountText = promotion.discountType === 'percentage' 
              ? `${promotion.discountValue}%` 
              : formatCurrency(promotion.discountValue)
            
            return (
              <Card key={promotion.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="relative h-40 bg-gradient-to-r from-orange-500 to-red-600 p-6 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-white">{discountText}</h3>
                    <p className="text-white text-lg">Giảm giá</p>
                  </div>
                  {promotion.discountType === 'percentage' && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                      HOT DEAL
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <h4 className="text-lg font-bold mb-2">{promotion.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{promotion.description}</p>
                  
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    <span>Từ {startDate} đến {endDate}</span>
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0">
                  <Link href="/products">
                    <Button className="w-full">Mua ngay</Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

