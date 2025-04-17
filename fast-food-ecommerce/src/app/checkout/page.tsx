"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { getUserAddresses, createAddress } from "@/services/addressService"
import { createOrder, cartToOrderItems } from "@/services/orderService"
import { createStripeCheckoutSession, createMomoPayment, createVnpayPayment } from "@/services/paymentService"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/loading-spinner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { log } from "console"

const addressSchema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(10, "Số điện thoại không hợp lệ"),
  province: z.string().min(1, "Vui lòng chọn tỉnh/thành phố"),
  district: z.string().min(1, "Vui lòng chọn quận/huyện"),
  ward: z.string().min(1, "Vui lòng chọn phường/xã"),
  streetAddress: z.string().min(5, "Địa chỉ phải có ít nhất 5 ký tự"),
})

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, token, isAuthenticated } = useAuth()
  const { cart, cartTotal, clearCart } = useCart()
  
  const [addresses, setAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  
  // Tính toán các sản phẩm được chọn
  const selectedProducts = cart.filter(item => selectedItems.includes(item.product?.id || 0))
  const selectedTotal = selectedProducts.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity, 
    0
  )
  
  const shippingFee = 0 // Miễn phí vận chuyển
  const totalWithShipping = selectedTotal - discountAmount + shippingFee

  // Kiểm tra đăng nhập ngay khi vào trang
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để thanh toán",
        variant: "destructive",
      });
      router.push("/login?redirect=/checkout");
      return;
    }
    
    // Lấy danh sách sản phẩm được chọn từ sessionStorage
    const getSelectedItems = () => {
      try {
        const savedItems = sessionStorage.getItem('selectedItems')
        if (savedItems) {
          setSelectedItems(JSON.parse(savedItems))
        }
      } catch (error) {
        console.error("Lỗi khi đọc danh sách sản phẩm đã chọn:", error)
      }
    }
    
    // Lấy thông tin mã giảm giá từ sessionStorage
    const getAppliedCoupon = () => {
      try {
        const savedCoupon = sessionStorage.getItem('appliedCoupon')
        const savedDiscount = sessionStorage.getItem('discountAmount')
        
        if (savedCoupon) {
          setAppliedCoupon(JSON.parse(savedCoupon))
        }
        
        if (savedDiscount) {
          setDiscountAmount(JSON.parse(savedDiscount))
        }
      } catch (error) {
        console.error("Lỗi khi đọc thông tin mã giảm giá:", error)
      }
    }
    
    getSelectedItems()
    getAppliedCoupon()
    
    // Kiểm tra nếu chưa đăng nhập hoặc giỏ hàng trống
    if (cart.length === 0) {
      router.push("/products")
      return
    }
    
    // Lấy danh sách địa chỉ
    const fetchAddresses = async () => {
      try {
        setLoading(true)
        if (!token) return
        
        const addressList = await getUserAddresses(token)
        setAddresses(addressList)
        
        // Nếu có địa chỉ mặc định, chọn địa chỉ đó
        const defaultAddress = addressList.find(addr => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
        } else if (addressList.length > 0) {
          setSelectedAddressId(addressList[0].id)
        } else {
          // Không có địa chỉ nào, hiển thị form thêm mới
          setShowNewAddressForm(true)
        }
      } catch (error) {
        console.error("Lỗi khi tải địa chỉ:", error)
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách địa chỉ",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchAddresses()
  }, [isAuthenticated, router, token, cart, toast])

  // Form mới cho địa chỉ
  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: user?.name || "",
      phone: "",
      province: "",
      district: "",
      ward: "",
      streetAddress: "",
    }
  })

  const onAddNewAddress = async (values: z.infer<typeof addressSchema>) => {
    try {
      setIsSubmitting(true)
      if (!token) return
      
      const newAddress = await createAddress({
        ...values,
        isDefault: addresses.length === 0 // Đặt là mặc định nếu là địa chỉ đầu tiên
      }, token)
      
      setAddresses([...addresses, newAddress])
      setSelectedAddressId(newAddress.id)
      setShowNewAddressForm(false)
      
      toast({
        title: "Thành công",
        description: "Đã thêm địa chỉ mới"
      })
    } catch (error) {
      console.error("Lỗi khi thêm địa chỉ:", error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm địa chỉ mới",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlaceOrder = async () => {
    console.log("handlePlaceOrderrrr")
    // if (!selectedAddressId && !showNewAddressForm) {
    //   toast({
    //     title: "Cần có địa chỉ",
    //     description: "Vui lòng chọn địa chỉ giao hàng",
    //     variant: "destructive"
    //   })
    //   return
    // }

    console.log("handlePlaceOrder 0")
    
    if (selectedItems.length === 0) {
      toast({
        title: "Không có sản phẩm nào được chọn",
        description: "Vui lòng quay lại giỏ hàng và chọn sản phẩm để thanh toán",
        variant: "destructive"
      })
      return
    }
    console.log("handlePlaceOrder 1")
    if (!token) {
      toast({
        title: "Lỗi xác thực",
        description: "Vui lòng đăng nhập lại",
        variant: "destructive"
      })
      router.push("/login?redirect=/checkout")
      return
    }
    
    try {
      setIsSubmitting(true)
      console.log("handlePlaceOrder 2")
      // Tạo đơn hàng
      const orderItems = cartToOrderItems(selectedProducts)
      const newOrder = await createOrder({
        deliveryAddressId: selectedAddressId || 0,
        paymentMethod,
        items: orderItems,
        notes,
        couponCode: appliedCoupon ? appliedCoupon.coupon.code : undefined,
        discountAmount: discountAmount
      }, token)
      console.log('paymentMethod', paymentMethod);
      
      // Nếu chọn thanh toán với Stripe, MoMo hoặc VNPay
      if (paymentMethod === "stripe") {
        console.log("handlePlaceOrder 3")
        try {
          const stripeSession = await createStripeCheckoutSession(newOrder.id, token)
          
          // Lưu ID đơn hàng vào session để dùng sau khi thanh toán
          sessionStorage.setItem('currentOrderId', newOrder.id.toString())
          
          // Kiểm tra phiên thanh toán có url không
          if (!stripeSession || !stripeSession.url) {
            console.error("Lỗi phiên thanh toán Stripe:", stripeSession)
            toast({
              title: "Lỗi thanh toán",
              description: "Không nhận được URL thanh toán từ Stripe. Chi tiết: " + JSON.stringify(stripeSession),
              variant: "destructive"
            })
            return
          }
          
          console.log("Chuyển hướng đến URL Stripe:", stripeSession.url)
          
          // Chuyển hướng đến trang thanh toán của Stripe
          window.location.href = stripeSession.url
          return
        } catch (stripeError: any) {
          console.error("Lỗi khi tạo phiên thanh toán Stripe:", stripeError)
          toast({
            title: "Lỗi thanh toán",
            description: "Lỗi: " + (stripeError.message || "Không thể kết nối với cổng thanh toán"),
            variant: "destructive"
          })
          return
        }
      } else if (paymentMethod === "momo") {
        try {
          const momoSession = await createMomoPayment(newOrder.id, token)
          
          // Lưu ID đơn hàng vào session để dùng sau khi thanh toán
          sessionStorage.setItem('currentOrderId', newOrder.id.toString())
          
          // Kiểm tra phiên thanh toán có payUrl không
          if (!momoSession || !momoSession.payUrl) {
            console.error("Lỗi phiên thanh toán MoMo:", momoSession)
            toast({
              title: "Lỗi thanh toán",
              description: "Không nhận được URL thanh toán từ MoMo. Chi tiết: " + JSON.stringify(momoSession),
              variant: "destructive"
            })
            return
          }
          
          console.log("Chuyển hướng đến URL MoMo:", momoSession.payUrl)
          
          // Chuyển hướng đến trang thanh toán của MoMo
          window.location.href = momoSession.payUrl
          return
        } catch (momoError: any) {
          console.error("Lỗi khi tạo phiên thanh toán MoMo:", momoError)
          toast({
            title: "Lỗi thanh toán",
            description: "Lỗi: " + (momoError.message || "Không thể kết nối với cổng thanh toán"),
            variant: "destructive"
          })
          return
        }
      } else if (paymentMethod === "vnpay") {
        try {
          const vnpaySession = await createVnpayPayment(newOrder.id, token)
          
          // Lưu ID đơn hàng vào session để dùng sau khi thanh toán
          sessionStorage.setItem('currentOrderId', newOrder.id.toString())
          
          // Kiểm tra phiên thanh toán có payUrl không
          if (!vnpaySession || !vnpaySession.payUrl) {
            console.error("Lỗi phiên thanh toán VNPay:", vnpaySession)
            toast({
              title: "Lỗi thanh toán",
              description: "Không nhận được URL thanh toán từ VNPay. Chi tiết: " + JSON.stringify(vnpaySession),
              variant: "destructive"
            })
            return
          }
          
          console.log("Chuyển hướng đến URL VNPay:", vnpaySession.payUrl)
          
          // Chuyển hướng đến trang thanh toán của VNPay
          window.location.href = vnpaySession.payUrl
          return
        } catch (vnpayError: any) {
          console.error("Lỗi khi tạo phiên thanh toán VNPay:", vnpayError)
          toast({
            title: "Lỗi thanh toán",
            description: "Lỗi: " + (vnpayError.message || "Không thể kết nối với cổng thanh toán"),
            variant: "destructive"
          })
          return
        }
      }
      
      // Cho phương thức COD hoặc nếu Stripe không thành công
      sessionStorage.removeItem('selectedItems')
      
      toast({
        title: "Đặt hàng thành công",
        description: `Mã đơn hàng: #${newOrder.id}`,
      })
      
      // Chuyển đến trang xác nhận đơn hàng
      router.push(`/orders/${newOrder.id}`)
    } catch (error) {
      console.error("Lỗi khi đặt hàng:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tạo đơn hàng. Vui lòng thử lại sau.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Nếu không đăng nhập, không hiển thị nội dung
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Thông tin đơn hàng */}
        <div className="lg:col-span-2 space-y-6">
          {/* Các sản phẩm đã chọn */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Sản phẩm đã chọn ({selectedItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProducts.length > 0 ? (
                <div className="space-y-4 divide-y">
                  {selectedProducts.map((item) => (
                    <div key={item.product?.id} className="pt-4 first:pt-0 grid grid-cols-12 gap-4">
                      <div className="col-span-8 flex gap-3">
                        <img
                          src={item.product?.imageUrl || "/images/placeholder-food.jpg"}
                          alt={item.product?.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <h3 className="font-medium">{item.product?.name}</h3>
                          <p className="text-sm text-gray-500">SL: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="col-span-4 text-right">
                        <p className="font-medium">{formatCurrency(item.product?.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>Không có sản phẩm nào được chọn</p>
                  <Button variant="link" className="mt-2" onClick={() => router.push('/cart')}>
                    Quay lại giỏ hàng
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Địa chỉ giao hàng */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Địa chỉ giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              {addresses.length > 0 && !showNewAddressForm && (
                <div className="space-y-4">
                  <RadioGroup 
                    value={selectedAddressId?.toString()} 
                    onValueChange={(value) => setSelectedAddressId(parseInt(value))}
                  >
                    {addresses.map((address) => (
                      <div key={address.id} className="flex items-center space-x-2 border p-3 rounded-md">
                        <RadioGroupItem value={address.id.toString()} id={`address-${address.id}`} />
                        <Label htmlFor={`address-${address.id}`} className="flex-grow cursor-pointer">
                          <div>
                            <div className="font-medium">{address.fullName} | {address.phone}</div>
                            <div className="text-sm text-gray-500">
                              {address.streetAddress}, {address.ward}, {address.district}, {address.province}
                            </div>
                            {address.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mt-1 inline-block">
                                Mặc định
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  <div className="pt-2">
                    <Button variant="outline" onClick={() => setShowNewAddressForm(true)}>
                      + Thêm địa chỉ mới
                    </Button>
                  </div>
                </div>
              )}
              
              {(showNewAddressForm || addresses.length === 0) && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAddNewAddress)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Họ tên</FormLabel>
                            <FormControl>
                              <Input placeholder="Nguyễn Văn A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Số điện thoại</FormLabel>
                            <FormControl>
                              <Input placeholder="0912345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tỉnh/Thành phố</FormLabel>
                            <FormControl>
                              <Input placeholder="Hà Nội" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="district"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quận/Huyện</FormLabel>
                            <FormControl>
                              <Input placeholder="Cầu Giấy" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phường/Xã</FormLabel>
                            <FormControl>
                              <Input placeholder="Dịch Vọng" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Địa chỉ chi tiết</FormLabel>
                          <FormControl>
                            <Input placeholder="Số nhà, tên đường" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-2 pt-2">
                      {addresses.length > 0 && (
                        <Button type="button" variant="outline" onClick={() => setShowNewAddressForm(false)}>
                          Hủy
                        </Button>
                      )}
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <LoadingSpinner size="small" /> : "Lưu địa chỉ"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
          
          {/* Phương thức thanh toán */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 border p-3 rounded-md mb-3">
                  <RadioGroupItem value="cod" id="payment-cod" />
                  <Label htmlFor="payment-cod" className="flex-grow cursor-pointer">
                    <div className="font-medium">Thanh toán khi nhận hàng (COD)</div>
                    <div className="text-sm text-gray-500">Bạn chỉ phải thanh toán khi nhận được hàng</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border p-3 rounded-md mb-3">
                  <RadioGroupItem value="stripe" id="payment-stripe" />
                  <Label htmlFor="payment-stripe" className="flex-grow cursor-pointer">
                    <div className="font-medium">Thanh toán bằng thẻ (Stripe)</div>
                    <div className="text-sm text-gray-500">Thanh toán an toàn bằng thẻ tín dụng/ghi nợ qua Stripe</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border p-3 rounded-md mb-3">
                  <RadioGroupItem value="momo" id="payment-momo" />
                  <Label htmlFor="payment-momo" className="flex-grow cursor-pointer">
                    <div className="font-medium">Thanh toán qua MoMo</div>
                    <div className="text-sm text-gray-500">Thanh toán nhanh chóng bằng ví điện tử MoMo</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border p-3 rounded-md">
                  <RadioGroupItem value="vnpay" id="payment-vnpay" />
                  <Label htmlFor="payment-vnpay" className="flex-grow cursor-pointer">
                    <div className="font-medium">Thanh toán qua VNPay</div>
                    <div className="text-sm text-gray-500">Thanh toán bằng QR, thẻ ATM nội địa, thẻ tín dụng qua VNPay</div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Ghi chú */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Ghi chú đơn hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Nhập ghi chú cho đơn hàng (tùy chọn)" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Tóm tắt */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Tạm tính ({selectedItems.length} sản phẩm):</span>
                  <span>{formatCurrency(selectedTotal)}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá ({appliedCoupon.coupon.code}):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>{shippingFee > 0 ? formatCurrency(shippingFee) : 'Miễn phí'}</span>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">{formatCurrency(totalWithShipping)}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                size="lg" 
                onClick={handlePlaceOrder}
                disabled={isSubmitting || selectedItems.length === 0}
              >
                {isSubmitting ? <LoadingSpinner size="small" /> : paymentMethod === "stripe" ? "Tiếp tục thanh toán" : "Đặt hàng"}
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-4">
                Bằng cách đặt hàng, bạn đồng ý với các điều khoản & điều kiện của chúng tôi
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

