"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Info, ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Recommendation {
  id: number
  name: string
  image?: string
  imageUrl?: string
  price: number | string
  description?: string
  stock?: number
  category?: string
  confidence?: number
  reasoning?: string
}

interface RecommendationCarouselProps {
  recommendations: Recommendation[]
}

export default function RecommendationCarousel({ recommendations }: RecommendationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoplay, setIsAutoplay] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // Chuyển sang kiểu hiển thị theo danh sách dọc để tiết kiệm không gian
  const [viewType, setViewType] = useState<'carousel' | 'list'>('list')

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isAutoplay && recommendations.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % recommendations.length)
      }, 5000)
    }

    return () => clearInterval(interval)
  }, [isAutoplay, recommendations.length, currentIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50 && touchEnd !== 0) {
      // Swipe left
      handleNext()
    }

    if (touchStart - touchEnd < -50 && touchEnd !== 0) {
      // Swipe right
      handlePrev()
    }

    setTouchEnd(0)
  }

  const handlePrev = () => {
    setIsAutoplay(false)
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? recommendations.length - 1 : prevIndex - 1
    )
  }

  const handleNext = () => {
    setIsAutoplay(false)
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % recommendations.length
    )
  }

  const handleAddToCart = (recommendationId: number) => {
    console.log(`Thêm sản phẩm ${recommendationId} vào giỏ hàng`)
    
    // Hiển thị thông báo thành công
    toast({
      title: "Đã thêm vào giỏ hàng",
      description: "Sản phẩm đã được thêm vào giỏ hàng của bạn.",
      duration: 3000,
    })
  }

  const handleViewDetails = (recommendationId: number) => {
    console.log(`Xem chi tiết sản phẩm ${recommendationId}`)
  }

  // Hiển thị danh sách dọc tiết kiệm không gian
  if (viewType === 'list') {
    return (
      <motion.div 
        className="bg-gray-50 dark:bg-gray-800 rounded-md p-2 overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gợi ý sản phẩm</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900"
            onClick={() => setViewType('carousel')}
          >
            Xem dạng carousel
          </Button>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {recommendations.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Link 
                  href={`/products/${item.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors bg-white/80 dark:bg-gray-700/80 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                      <Image
                        src={item.imageUrl || item.image || "/images/placeholder-food.jpg"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-50 line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {item.description || "Không có mô tả"}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                          {typeof item.price === 'number' 
                            ? formatPrice(item.price)
                            : formatPrice(parseFloat(item.price as string))}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 py-0 text-xs bg-transparent hover:bg-red-50 text-red-600 border-red-200"
                        >
                          Thêm
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // Hiển thị dạng carousel
  return (
    <motion.div
      className="relative w-full bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={carouselRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute top-0 right-0 z-10 p-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs bg-white/80 hover:bg-white dark:bg-gray-700/80 dark:hover:bg-gray-700"
          onClick={() => setViewType('list')}
        >
          Xem dạng danh sách
        </Button>
      </div>
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {recommendations.map((recommendation, index) => (
            <div
              key={`${recommendation.id}-${index}`}
              className="w-full flex-shrink-0"
            >
              <div className="p-3">
                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-gray-600">
                  <div className="relative h-40 w-full">
                    <Image
                      src={recommendation.imageUrl || recommendation.image || "/images/placeholder-food.jpg"}
                      alt={recommendation.name}
                      fill
                      className="object-cover"
                    />
                    {recommendation.reasoning && (
                      <div className="absolute top-2 right-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="cursor-help bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800">
                                <Info className="h-3 w-3 mr-1" /> Lý do
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[250px]">
                              {recommendation.reasoning}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-50 line-clamp-1">{recommendation.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 mt-1">
                      {recommendation.description || "Không có mô tả"}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        {typeof recommendation.price === 'number' 
                          ? formatPrice(recommendation.price)
                          : formatPrice(parseFloat(recommendation.price as string))}
                      </p>
                      {recommendation.stock !== undefined && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {recommendation.stock > 0 ? `Còn ${recommendation.stock}` : 'Hết hàng'}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleAddToCart(recommendation.id)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                        Thêm vào giỏ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 border-red-200"
                        asChild
                      >
                        <Link href={`/products/${recommendation.id}`}>
                          Chi tiết
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {recommendations.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {recommendations.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex
                  ? "bg-red-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
              onClick={() => {
                setCurrentIndex(index)
                setIsAutoplay(false)
              }}
            />
          ))}
        </div>
      )}
      
      {recommendations.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 dark:bg-gray-800/70 flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 dark:bg-gray-800/70 flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors"
            onClick={handleNext}
          >
            <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </>
      )}
    </motion.div>
  )
}

