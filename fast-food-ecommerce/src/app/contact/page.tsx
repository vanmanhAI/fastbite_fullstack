"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react"

export default function ContactPage() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      subject: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Gửi thành công",
        description: "Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.",
      })
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      })
    }, 1500)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center text-4xl font-bold">Liên hệ với chúng tôi</h1>

      <div className="mb-12">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.4241674197956!2d106.69901937465353!3d10.777938089387621!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4670702e31%3A0xa5777fb3a5bb9972!2sBen%20Thanh%20Market!5e0!3m2!1sen!2s!4v1685000000000!5m2!1sen!2s"
          width="100%"
          height="450"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="FastBite Location"
          className="rounded-xl"
        ></iframe>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <div className="rounded-full bg-red-100 p-3">
                  <MapPin className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold">Địa chỉ</h3>
                  <p className="text-gray-600">123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <div className="rounded-full bg-red-100 p-3">
                  <Phone className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold">Điện thoại</h3>
                  <p className="text-gray-600">(028) 3823 4567</p>
                  <p className="text-gray-600">Hotline: 1900 1234</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <div className="rounded-full bg-red-100 p-3">
                  <Mail className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold">Email</h3>
                  <p className="text-gray-600">info@fastbite.com</p>
                  <p className="text-gray-600">support@fastbite.com</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start space-x-4 p-6">
                <div className="rounded-full bg-red-100 p-3">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold">Giờ mở cửa</h3>
                  <p className="text-gray-600">Thứ 2 - Thứ 6: 9:00 - 22:00</p>
                  <p className="text-gray-600">Thứ 7 - Chủ nhật: 10:00 - 23:00</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-6 text-2xl font-bold">Gửi tin nhắn cho chúng tôi</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@gmail.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="0912345678"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Chủ đề</Label>
                    <Select value={formData.subject} onValueChange={handleSelectChange}>
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Chọn chủ đề" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Thông tin chung</SelectItem>
                        <SelectItem value="order">Đơn hàng</SelectItem>
                        <SelectItem value="complaint">Khiếu nại</SelectItem>
                        <SelectItem value="partnership">Hợp tác</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Tin nhắn</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Nhập nội dung tin nhắn của bạn..."
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Đang gửi..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Gửi tin nhắn
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Các chi nhánh của chúng tôi</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.name}>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-bold">{branch.name}</h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-start">
                    <MapPin className="mr-2 h-5 w-5 shrink-0 text-red-600" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="mr-2 h-5 w-5 text-red-600" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-red-600" />
                    <span>{branch.hours}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

const branches = [
  {
    name: "FastBite Quận 1",
    address: "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
    phone: "(028) 3823 4567",
    hours: "10:00 - 22:00",
  },
  {
    name: "FastBite Quận 3",
    address: "45 Đường Võ Văn Tần, Quận 3, TP. Hồ Chí Minh",
    phone: "(028) 3823 4568",
    hours: "10:00 - 22:00",
  },
  {
    name: "FastBite Quận 7",
    address: "789 Đường Nguyễn Thị Thập, Quận 7, TP. Hồ Chí Minh",
    phone: "(028) 3823 4569",
    hours: "10:00 - 22:00",
  },
  {
    name: "FastBite Hà Nội",
    address: "55 Đường Lý Thường Kiệt, Quận Hoàn Kiếm, Hà Nội",
    phone: "(024) 3823 4570",
    hours: "10:00 - 22:00",
  },
  {
    name: "FastBite Đà Nẵng",
    address: "123 Đường Nguyễn Văn Linh, Quận Hải Châu, Đà Nẵng",
    phone: "(0236) 3823 4571",
    hours: "10:00 - 22:00",
  },
  {
    name: "FastBite Cần Thơ",
    address: "456 Đường 30/4, Quận Ninh Kiều, Cần Thơ",
    phone: "(0292) 3823 4572",
    hours: "10:00 - 22:00",
  },
]

