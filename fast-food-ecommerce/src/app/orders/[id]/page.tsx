"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getOrderById, cancelOrder } from "@/services/orderService"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import LoadingSpinner from "@/components/loading-spinner"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function OrderDetails() {
  const params = useParams()
  const { id } = params
  const { token } = useAuth()
  const { toast } = useToast()
  
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const orderData = await getOrderById(Number(id), token)
        setOrder(orderData)
      } catch (error) {
        console.error("Lỗi khi tải thông tin đơn hàng:", error)
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin đơn hàng",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    if (id && token) {
      fetchOrder()
    }
  }, [id, token, toast])
  
  const handleCancelOrder = async () => {
    try {
      setCancelling(true)
      const updatedOrder = await cancelOrder(Number(id), token)
      setOrder(updatedOrder)
      toast({
        title: "Thành công",
        description: "Đơn hàng đã được hủy"
      })
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error)
      toast({
        title: "Lỗi",
        description: "Không thể hủy đơn hàng",
        variant: "destructive"
      })
    } finally {
      setCancelling(false)
    }
  }
  
  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipping: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    }
    
    const statusText = {
      pending: "Chờ xác nhận",
      processing: "Đang xử lý",
      shipping: "Đang giao hàng",
      delivered: "Đã giao hàng",
      cancelled: "Đã hủy"
    }
    
    return (
      <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>
        {statusText[status] || status}
      </Badge>
    )
  }
  
  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      </div>
    )
  }
  
  if (!order) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Không tìm thấy đơn hàng</h1>
        <p className="mb-6">Đơn hàng này không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link href="/orders">
          <Button>Xem danh sách đơn hàng</Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Chi tiết đơn hàng #{order.id}</h1>
          <p className="text-gray-500">
            Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {getStatusBadge(order.status)}
          
          {order.status === 'pending' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Hủy đơn hàng</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận hủy đơn hàng</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <Link href="/orders">
            <Button variant="outline">Danh sách đơn hàng</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Danh sách sản phẩm */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Sản phẩm đã đặt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="w-16 h-16 relative overflow-hidden rounded">
                      <img
                        src={item.product?.imageUrl || "/images/placeholder-food.jpg"}
                        alt={item.product?.name || "Sản phẩm"}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="ml-4 flex-grow">
                      <h3 className="font-medium">{item.product?.name || "Sản phẩm"}</h3>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-gray-500">
                          {formatCurrency(item.product?.price || 0)} x {item.quantity}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.product?.price || 0 * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Thông tin giao hàng */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Thông tin giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">Địa chỉ giao hàng</h3>
                  <p className="text-gray-700">{order.deliveryAddress}</p>
                </div>
                
                {order.notes && (
                  <div>
                    <h3 className="font-medium">Ghi chú</h3>
                    <p className="text-gray-700">{order.notes}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium">Phương thức thanh toán</h3>
                  <p className="text-gray-700">
                    {order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 
                    order.paymentMethod === 'bank' ? 'Chuyển khoản ngân hàng' : 
                    order.paymentMethod}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tóm tắt đơn hàng */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Tổng quan đơn hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Phí vận chuyển:</span>
                    <span>Miễn phí</span>
                  </div>
                  
                  {order.couponCode && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá:</span>
                      <span>-{formatCurrency(order.discountAmount || 0)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng:</span>
                    <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
                
                {order.status === 'pending' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">Hủy đơn hàng</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận hủy đơn hàng</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelOrder}
                          disabled={cancelling}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {order.status === 'delivered' && (
                  <Link href={`/products/${order.orderItems[0]?.productId}`}>
                    <Button className="w-full">Đánh giá sản phẩm</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 