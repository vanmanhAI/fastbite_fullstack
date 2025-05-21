"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import ProductCard from "@/components/product-card"
import LoadingSpinner from "@/components/loading-spinner"
import { getProducts } from "@/services/productService"
import { trackSearchQuery } from "@/services/recommendationService"
import { useAuth } from "@/contexts/AuthContext"

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const { isAuthenticated } = useAuth()

  // Tìm kiếm khi có query từ URL
  useEffect(() => {
    if (initialQuery) {
      handleSearch()
    }
  }, [initialQuery])

  // Hàm xử lý tìm kiếm
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setHasSearched(true)
    
    try {
      // Theo dõi hành vi tìm kiếm
      await trackSearchQuery(searchQuery)
      
      // Lấy kết quả tìm kiếm từ API
      const response = await getProducts(
        currentPage,
        12,
        undefined,
        searchQuery
      )
      
      setProducts(response.data)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error("Lỗi khi tìm kiếm sản phẩm:", error)
    } finally {
      setLoading(false)
    }
  }

  // Xử lý submit form - chỉ tìm kiếm khi người dùng nhấn tìm kiếm hoặc Enter
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
    
    // Cập nhật URL với query tìm kiếm
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    router.push(`/search?${params.toString()}`)
  }

  // Xử lý thay đổi trong ô input - không gọi API khi đang nhập
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Xử lý thay đổi trang
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo(0, 0)
    
    // Thực hiện tìm kiếm lại khi chuyển trang
    handleSearch()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-6">Tìm kiếm sản phẩm</h1>
        
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg">
          <Input
            type="text"
            placeholder="Nhập tên món ăn, loại đồ ăn..."
            value={searchQuery}
            onChange={handleInputChange}
            className="flex-grow"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Tìm kiếm
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center my-16">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {hasSearched && (
            <div className="mb-4">
              {products.length > 0 ? (
                <p className="text-gray-600">Tìm thấy {products.length} sản phẩm phù hợp</p>
              ) : (
                <p className="text-gray-600">Không tìm thấy sản phẩm nào phù hợp</p>
              )}
            </div>
          )}

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            hasSearched && (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <p className="text-gray-500">Không tìm thấy sản phẩm nào phù hợp với từ khóa "{searchQuery}".</p>
                <p className="text-gray-500 mt-2">Hãy thử với từ khóa khác hoặc xem danh sách sản phẩm của chúng tôi.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/products')}
                >
                  Xem tất cả sản phẩm
                </Button>
              </div>
            )
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Trang trước
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
                Trang sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
} 