"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { API_URL } from "@/config"
import { Order } from "@/types/product"
import { useAuth } from "@/contexts/AuthContext"

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('authToken')
        
        const response = await fetch(`${API_URL}/orders/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Không thể tải thông tin đơn hàng")
        }

        const data = await response.json()
        setOrder(data)
      } catch (error) {
        setError("Đã xảy ra lỗi khi tải thông tin đơn hàng")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchOrderDetails()
    }
  }, [params.id, isAuthenticated])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <p className="text-lg">Đang tải thông tin đơn hàng...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Không thể tải thông tin đơn hàng</h2>
              <p className="text-gray-500 mb-6">{error || "Đơn hàng không tồn tại hoặc bạn không có quyền truy cập."}</p>
              <Link href="/">
                <Button>Quay lại trang chủ</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Đặt hàng thành công!</h2>
            <p className="text-gray-500">
              Cảm ơn bạn đã đặt hàng. Đơn hàng #{params.id} của bạn đã được xác nhận.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-3">Thông tin đơn hàng</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mã đơn hàng:</span>
                      <span className="font-medium">#{order.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày đặt hàng:</span>
                      <span className="font-medium">
                        {new Date(order.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trạng thái:</span>
                      <span className="font-medium">
                        {order.status === "pending" ? "Đang xử lý" :
                         order.status === "processing" ? "Đang chuẩn bị" :
                         order.status === "completed" ? "Đã hoàn thành" : "Đã hủy"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phương thức thanh toán:</span>
                      <span className="font-medium">
                        {order.payment_method === "credit_card" ? "Thẻ tín dụng" :
                         order.payment_method === "paypal" ? "PayPal" : "Tiền mặt khi nhận hàng"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trạng thái thanh toán:</span>
                      <span className={`font-medium ${
                        order.payment_status === "paid" ? "text-green-600" :
                        order.payment_status === "failed" ? "text-red-600" : ""
                      }`}>
                        {order.payment_status === "paid" ? "Đã thanh toán" :
                         order.payment_status === "pending" ? "Chờ thanh toán" : "Thanh toán thất bại"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">Địa chỉ giao hàng</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <p>{order.shipping_address.address}</p>
                    <p>{order.shipping_address.city}, {order.shipping_address.postal_code}</p>
                    <p>{order.shipping_address.country}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-lg mb-3">Sản phẩm đã đặt</h3>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center pb-3 border-b last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                      </div>
                      <p className="font-medium">${item.total.toFixed(2)}</p>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Tổng cộng</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center mt-8">
            <Link href="/">
              <Button className="mx-2">Quay lại trang chủ</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="mx-2">Tiếp tục mua sắm</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 