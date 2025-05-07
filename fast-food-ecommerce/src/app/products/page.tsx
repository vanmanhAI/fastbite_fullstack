"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import ProductCard from "@/components/product-card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FilterX, SlidersHorizontal, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { getProducts } from '@/services/productService'
import { getAllCategories } from '@/services/categoryService'
import LoadingSpinner from '@/components/loading-spinner'
import { Input } from "@/components/ui/input"
import ProductHeroSlider from "@/components/products/product-hero-slider"
import CategorySlider from "@/components/products/category-slider"

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category')
  const searchQuery = searchParams.get('q')
  
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState(searchQuery || '')
  const [filter, setFilter] = useState({
    category: categorySlug || '',
    vegetarian: false,
    priceMin: '',
    priceMax: '',
  })
  
  useEffect(() => {
    // Lấy danh sách danh mục
    const fetchCategories = async () => {
      try {
        const categoriesData = await getAllCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    // Lấy danh sách sản phẩm với bộ lọc
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await getProducts(
          currentPage,
          12,
          filter.category,
          search,
          undefined,
          filter.vegetarian
        )
        
        setProducts(response.data)
        setTotalPages(response.pagination.totalPages)
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [currentPage, filter, search])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo(0, 0)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const handleFilterChange = (name: string, value: any) => {
    setFilter(prev => ({ ...prev, [name]: value }))
    setCurrentPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Slider hiển thị sản phẩm nổi bật */}
      <ProductHeroSlider className="mb-10" />
      
      {/* Slider danh mục */}
      <div className="px-6 mb-10">
        <h2 className="text-2xl font-bold mb-4">Khám phá danh mục</h2>
        <CategorySlider />
      </div>

      <h1 className="text-3xl font-bold mb-8 text-center">Thực đơn của chúng tôi</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 space-y-6">
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium text-lg mb-4">Tìm kiếm</h3>
            <form onSubmit={handleSearchSubmit} className="flex">
              <Input
                type="text"
                placeholder="Tìm món ăn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" size="sm" className="ml-2">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium text-lg mb-4">Danh mục</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <Button
                  variant={filter.category === '' ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleFilterChange('category', '')}
                >
                  Tất cả
                </Button>
              </div>
              
              {categories.map((category) => (
                <div key={category.id} className="flex items-center">
                  <Button
                    variant={filter.category === category.slug ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('category', category.slug)}
                  >
                    {category.name}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium text-lg mb-4">Lọc</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="vegetarian" 
                  checked={filter.vegetarian}
                  onCheckedChange={(checked) => 
                    handleFilterChange('vegetarian', checked)
                  }
                />
                <Label htmlFor="vegetarian">Món chay</Label>
              </div>
              
              {/* Có thể thêm thêm các bộ lọc khác ở đây */}
            </div>
          </div>
        </div>
        
        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center my-16">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {products && products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không tìm thấy sản phẩm nào phù hợp.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products && products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      onClick={() => handlePageChange(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

