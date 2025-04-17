"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getAllCategories } from "@/services/categoryService"
import { Card, CardContent } from "@/components/ui/card"
import LoadingSpinner from "@/components/loading-spinner"

export default function CategorySection() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const data = await getAllCategories()
        // Chỉ lấy các danh mục cấp cao nhất (không có parent)
        const mainCategories = data.filter(cat => !cat.parentId)
        setCategories(mainCategories)
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {categories.map((category) => (
        <Link key={category.id} href={`/products?category=${category.slug}`}>
          <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="aspect-square relative">
              <img
                src={category.imageUrl || "/images/placeholder-category.jpg"}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4 text-center">
              <h3 className="font-medium text-gray-900 capitalize">{category.name}</h3>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

