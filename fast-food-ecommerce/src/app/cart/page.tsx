"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { useToast } from "@/components/ui/use-toast"
import { applyCoupon } from "@/services/promotionService"
import { formatCurrency } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, Trash2, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function CartPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // Kiểm tra đăng nhập ngay khi vào trang
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để xem giỏ hàng",
        variant: "destructive",
      })
      router.push("/login?redirect=/cart")
    }
  }, [isAuthenticated, router, toast])

  // Nếu không đăng nhập, không hiển thị nội dung
  if (!isAuthenticated) {
    return null
  }

  // Tính toán tổng tiền và giảm giá
  const selectedTotal = cart.reduce((sum, item) => {
    if (selectedItems.includes(item.product?.id || 0)) {
      return sum + (item.product?.price || 0) * item.quantity
    }
    return sum
  }, 0)
  
  const discount = appliedCoupon 
    ? appliedCoupon.promotion.discountType === 'percentage'
      ? (selectedTotal * appliedCoupon.promotion.discountValue) / 100
      : appliedCoupon.promotion.discountValue
    : 0
  
  const finalTotal = selectedTotal - Math.min(discount, selectedTotal)
  const shippingFee = 0 // Miễn phí vận chuyển

  // Xử lý chọn tất cả
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([])
    } else {
      setSelectedItems(cart.map(item => item.product?.id || 0))
    }
    setSelectAll(!selectAll)
  }

  // Xử lý chọn một mặt hàng
  const handleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id))
      setSelectAll(false)
    } else {
      setSelectedItems([...selectedItems, id])
      // Kiểm tra nếu tất cả đều được chọn
      if (selectedItems.length + 1 === cart.length) {
        setSelectAll(true)
      }
    }
  }

  const handleCouponApply = async () => {
    if (!couponCode.trim()) return
    
    try {
      setCouponError("")
      setIsApplyingCoupon(true)
      
      const result = await applyCoupon(couponCode)
      setAppliedCoupon(result)
      
      toast({
        title: "Áp dụng mã giảm giá thành công",
        description: result.promotion.discountType === 'percentage'
          ? `Giảm ${result.promotion.discountValue}% cho đơn hàng`
          : `Giảm ${formatCurrency(result.promotion.discountValue)} cho đơn hàng`
      })
    } catch (error) {
      setCouponError("Mã giảm giá không hợp lệ hoặc đã hết hạn")
      setAppliedCoupon(null)
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Chưa có sản phẩm nào được chọn",
        description: "Vui lòng chọn ít nhất một sản phẩm để thanh toán",
        variant: "destructive",
      })
      return
    }
    
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để tiến hành thanh toán",
        variant: "destructive",
      })
      router.push("/login?redirect=/checkout")
      return
    }
    
    // Lưu danh sách sản phẩm đã chọn vào sessionStorage
    sessionStorage.setItem('selectedItems', JSON.stringify(selectedItems))
    
    // Lưu thông tin mã giảm giá (nếu có) vào sessionStorage
    if (appliedCoupon) {
      sessionStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon))
      // Lưu giá trị giảm giá
      sessionStorage.setItem('discountAmount', JSON.stringify(discount))
    } else {
      sessionStorage.removeItem('appliedCoupon')
      sessionStorage.removeItem('discountAmount')
    }
    
    router.push("/checkout")
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-xl mb-4">Giỏ hàng của bạn đang trống</h2>
          <p className="text-gray-500 mb-6">Hãy thêm một vài món ăn ngon vào giỏ hàng của bạn.</p>
          <Link href="/products">
            <Button size="lg">Xem thực đơn</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8">Giỏ hàng</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b">
              <div className="col-span-1 flex items-center justify-center">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  aria-label="Chọn tất cả sản phẩm"
                />
              </div>
              <div className="col-span-5 font-medium">Sản phẩm</div>
              <div className="col-span-2 text-center font-medium">Giá</div>
              <div className="col-span-2 text-center font-medium">Số lượng</div>
              <div className="col-span-2 text-right font-medium">Tổng</div>
            </div>
            
            {/* Items */}
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.product?.id || 0} className="grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-1 flex justify-center">
                    <Checkbox
                      checked={selectedItems.includes(item.product?.id || 0)}
                      onCheckedChange={() => handleSelectItem(item.product?.id || 0)}
                      aria-label={`Chọn ${item.product?.name || "sản phẩm"}`}
                    />
                  </div>
                  
                  <div className="col-span-5 flex gap-3">
                    <img 
                      src={item.product?.imageUrl || "/images/placeholder-food.jpg"} 
                      alt={item.product?.name || "Sản phẩm"}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-medium">{item.product?.name || "Sản phẩm"}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{item.product?.description || "Mô tả sản phẩm"}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    {formatCurrency(item.product?.price || 0)}
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center justify-center">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => updateQuantity(item.product?.id || 0, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="h-8 px-3 flex items-center justify-center border-y">
                        {item.quantity}
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => updateQuantity(item.product?.id || 0, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex justify-end items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(item.product?.price * item.quantity || 0)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-500 hover:text-red-600"
                      onClick={() => removeFromCart(item.product?.id || 0 )}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Actions */}
            <div className="p-4 bg-gray-50 flex justify-between">
              <Button variant="outline" onClick={() => clearCart()}>
                Xóa giỏ hàng
              </Button>
              <Link href="/products">
                <Button variant="outline">
                  Tiếp tục mua sắm
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Tóm tắt đơn hàng</h2>
            
            {/* Coupon */}
            <div className="mb-6">
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Mã giảm giá"
                  className="flex-grow"
                />
                <Button
                  variant="outline"
                  onClick={handleCouponApply}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                >
                  Áp dụng
                </Button>
              </div>
              
              {couponError && (
                <p className="text-red-500 text-xs mt-1">{couponError}</p>
              )}
              
              {appliedCoupon && (
                <div className="mt-2 flex items-center bg-green-50 text-green-700 p-2 rounded text-sm">
                  <span className="flex-grow">
                    Mã <strong>{appliedCoupon.coupon.code}</strong> đã được áp dụng
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 text-green-700"
                    onClick={() => setAppliedCoupon(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Summary */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Đã chọn {selectedItems.length} sản phẩm</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatCurrency(selectedTotal)}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Phí vận chuyển:</span>
                <span>{shippingFee > 0 ? formatCurrency(shippingFee) : 'Miễn phí'}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng:</span>
                <span className="text-primary">{formatCurrency(finalTotal + shippingFee)}</span>
              </div>
            </div>
            
            <Button 
              className="w-full mt-6" 
              size="lg" 
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

