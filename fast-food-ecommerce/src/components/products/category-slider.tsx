"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import useEmblaCarousel from 'embla-carousel-react'
import { getAllCategories } from '@/services/categoryService'

interface CategorySliderProps {
  className?: string
}

export default function CategorySlider({ className }: CategorySliderProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps'
  })

  // Lấy danh mục từ database
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true)
        const response = await getAllCategories()
        // Lấy các danh mục cha (không có parent_id)
        if (response && response.length > 0) {
          const mainCategories = response.filter((cat: any) => cat.parent_id === null)
          if (mainCategories.length > 0) {
            setCategories(mainCategories)
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCategories()
  }, [])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  if (loading) {
    return (
      <div className={`w-full bg-gray-100 animate-pulse h-20 rounded-xl ${className}`}></div>
    )
  }

  if (categories.length === 0) {
    return null
  }

  // Tạo màu nền khác nhau cho mỗi danh mục
  const colors = [
    "bg-red-100 border-red-200 text-red-800 hover:bg-red-200",
    "bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200",
    "bg-green-100 border-green-200 text-green-800 hover:bg-green-200",
    "bg-purple-100 border-purple-200 text-purple-800 hover:bg-purple-200",
    "bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200",
    "bg-pink-100 border-pink-200 text-pink-800 hover:bg-pink-200",
    "bg-indigo-100 border-indigo-200 text-indigo-800 hover:bg-indigo-200",
    "bg-orange-100 border-orange-200 text-orange-800 hover:bg-orange-200",
  ]

  return (
    <div className={`relative ${className}`}>
      <div className="embla overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex">
          {categories.map((category, index) => (
            <div key={category.id} className="embla__slide mr-4 flex-grow-0 flex-shrink-0 min-w-[180px] md:min-w-[200px]">
              <Link 
                href={`/products?category=${category.slug}`}
                className={`block h-full ${colors[index % colors.length]} rounded-xl border p-3 transition-colors duration-200 group hover:shadow-md`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-12 w-12 overflow-hidden rounded-lg">
                    <img 
                      src={category.image_url || `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(category.name)}`}
                      alt={category.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(category.name)}`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-xs truncate opacity-70">{
                      category.description.length > 30 
                        ? category.description.substring(0, 30) + '...' 
                        : category.description
                    }</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      {/* Điều hướng */}
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute -left-5 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-white border-gray-200 text-gray-800 shadow-lg hover:bg-gray-50"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute -right-5 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-white border-gray-200 text-gray-800 shadow-lg hover:bg-gray-50"
        onClick={scrollNext}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
} 