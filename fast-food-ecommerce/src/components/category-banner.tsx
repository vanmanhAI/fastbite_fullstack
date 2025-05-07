"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getAllCategories } from '@/services/categoryService'
import LoadingSpinner from '@/components/loading-spinner'

interface CategoryBannerProps {
  className?: string
}

export default function CategoryBanner({ className }: CategoryBannerProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true)
        const response = await getAllCategories()
        console.log("Danh mục:", response?.length || 0, "danh mục")
        
        // Lấy các danh mục cha (không có parent_id)
        if (response && response.length > 0) {
          const mainCategories = response.filter((cat: any) => cat.parent_id === null)
          if (mainCategories.length > 0) {
            setCategories(mainCategories)
          } else {
            // Nếu không có danh mục cha, sử dụng dữ liệu mẫu
            setCategories(sampleCategories)
            console.log("Sử dụng dữ liệu mẫu cho banner danh mục (không có danh mục cha)")
          }
        } else {
          // Nếu không có danh mục, sử dụng dữ liệu mẫu
          setCategories(sampleCategories)
          console.log("Sử dụng dữ liệu mẫu cho banner danh mục (không có dữ liệu)")
        }
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error)
        // Sử dụng dữ liệu mẫu trong trường hợp lỗi
        setCategories(sampleCategories)
        console.log("Sử dụng dữ liệu mẫu cho banner danh mục do lỗi")
      } finally {
        setLoading(false)
      }
    }
    
    fetchCategories()
  }, [])

  if (loading) {
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>
  }

  if (categories.length === 0) {
    return null
  }

  // Chọn màu ngẫu nhiên cho gradient
  const gradients = [
    "from-red-600 to-orange-500",
    "from-blue-600 to-indigo-500",
    "from-green-600 to-emerald-500",
    "from-purple-600 to-pink-500",
    "from-yellow-600 to-amber-500"
  ]

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">Khám Phá Danh Mục</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Link 
              key={category.id} 
              href={`/products?category=${category.slug}`} 
              className="block group"
            >
              <div className={`h-80 relative rounded-xl overflow-hidden bg-gradient-to-r ${gradients[index % gradients.length]}`}>
                {/* Hình ảnh danh mục */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={category.image_url || `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(category.name)}`}
                    alt={category.name}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(category.name)}`;
                    }}
                  />
                </div>
                
                {/* Nội dung */}
                <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 w-full max-w-xs transform group-hover:scale-105 transition-transform duration-300">
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {category.name}
                    </h3>
                    <p className="text-white/80 mb-4">
                      {category.description}
                    </p>
                    <Button className="bg-white text-black hover:bg-gray-100">
                      Xem Thêm
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// Dữ liệu mẫu để sử dụng khi không có dữ liệu từ API
const sampleCategories = [
  {
    id: 1,
    name: "Burger",
    slug: "burger",
    description: "Các loại burger thơm ngon với nhiều lựa chọn nhân thịt bò, gà, và hải sản",
    image_url: "/placeholder.svg?height=400&width=600&text=Burger"
  },
  {
    id: 2,
    name: "Pizza",
    slug: "pizza",
    description: "Pizza đế mỏng và đế dày với nhiều loại topping đa dạng",
    image_url: "/placeholder.svg?height=400&width=600&text=Pizza"
  },
  {
    id: 3,
    name: "Gà Rán",
    slug: "fried-chicken",
    description: "Gà rán giòn, thơm ngon với nhiều loại sốt đặc biệt",
    image_url: "/placeholder.svg?height=400&width=600&text=Fried+Chicken"
  },
  {
    id: 4,
    name: "Nước Uống",
    slug: "beverages",
    description: "Các loại đồ uống giải khát: nước ngọt, nước ép, trà và cà phê",
    image_url: "/placeholder.svg?height=400&width=600&text=Beverages"
  },
  {
    id: 5,
    name: "Combo Tiết Kiệm",
    slug: "combo",
    description: "Combo tiết kiệm với nhiều món ăn và đồ uống hấp dẫn",
    image_url: "/placeholder.svg?height=400&width=600&text=Combo"
  }
] 