"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, MapPin, CreditCard, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/loading-spinner"

// Sample user data
const userData = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1 (555) 123-4567",
  addresses: [
    {
      id: 1,
      type: "Home",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      isDefault: true,
    },
    {
      id: 2,
      type: "Work",
      street: "456 Office Blvd",
      city: "New York",
      state: "NY",
      zip: "10002",
      isDefault: false,
    },
  ],
  paymentMethods: [
    {
      id: 1,
      type: "Credit Card",
      last4: "4242",
      expiry: "04/25",
      brand: "Visa",
      isDefault: true,
    },
    {
      id: 2,
      type: "Credit Card",
      last4: "1234",
      expiry: "12/24",
      brand: "Mastercard",
      isDefault: false,
    },
  ],
}

// Sample order history
const orderHistory = [
  {
    id: "ORD-12345",
    date: "2023-05-15",
    total: 27.97,
    status: "Delivered",
    items: [
      { name: "Classic Cheeseburger", quantity: 2, price: 8.99 },
      { name: "Chocolate Milkshake", quantity: 2, price: 4.99 },
    ],
  },
  {
    id: "ORD-12344",
    date: "2023-05-10",
    total: 12.99,
    status: "Delivered",
    items: [{ name: "Vegetarian Pizza", quantity: 1, price: 12.99 }],
  },
  {
    id: "ORD-12343",
    date: "2023-05-05",
    total: 22.97,
    status: "Delivered",
    items: [
      { name: "Spicy Chicken Burger", quantity: 2, price: 7.99 },
      { name: "Vanilla Shake", quantity: 1, price: 4.99 },
      { name: "French Fries", quantity: 1, price: 2.99 },
    ],
  },
]

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/profile")
      return
    }

    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
      })
      setLoading(false)
    }
  }, [isAuthenticated, router, user])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // Chức năng cập nhật thông tin người dùng sẽ được triển khai sau
    toast({
      title: "Thông báo",
      description: "Tính năng đang được phát triển!",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Thông tin tài khoản</h1>
                  <p className="text-gray-500">Xem và cập nhật thông tin cá nhân của bạn</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Họ tên</Label>
                      <Input
                        id="name"
                        placeholder="Nhập họ tên của bạn"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Nhập email của bạn"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled
                      />
                      <p className="text-xs text-gray-500">Email không thể thay đổi</p>
                    </div>
                  </div>
                </div>

                <Button type="submit">Lưu thay đổi</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" /> Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {user.paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="mr-4">
                        {method.brand === "Visa" ? (
                          <div className="w-10 h-6 bg-blue-600 rounded text-white flex items-center justify-center text-xs font-bold">
                            VISA
                          </div>
                        ) : (
                          <div className="w-10 h-6 bg-red-500 rounded text-white flex items-center justify-center text-xs font-bold">
                            MC
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {method.brand} ending in {method.last4}
                        </p>
                        <p className="text-sm text-gray-500">Expires {method.expiry}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {method.isDefault && (
                        <Badge variant="outline" className="mr-2">
                          Default
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="mt-2">
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" /> Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {orderHistory.map((order) => (
                  <div key={order.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <p className="font-medium">{order.id}</p>
                        <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${order.total.toFixed(2)}</p>
                        <Badge
                          variant={
                            order.status === "Delivered"
                              ? "success"
                              : order.status === "Processing"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium mb-2">Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          Reorder
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" /> Delivery Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {user.addresses.map((address) => (
                  <div key={address.id} className="border p-4 rounded-lg flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{address.type}</p>
                        {address.isDefault && <Badge variant="outline">Default</Badge>}
                      </div>
                      <p className="text-sm">{address.street}</p>
                      <p className="text-sm">
                        {address.city}, {address.state} {address.zip}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      {!address.isDefault && (
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="mt-2">
                  Add New Address
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

