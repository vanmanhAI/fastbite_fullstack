import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Clock, Copy, ExternalLink } from "lucide-react"

export default function PromotionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-4xl font-bold">Khuyến mãi</h1>
      <p className="mb-8 text-lg text-gray-600">Khám phá các ưu đãi hấp dẫn từ FastBite</p>

      <Tabs defaultValue="current" className="mb-12">
        <TabsList className="mb-8 grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="current">Đang diễn ra</TabsTrigger>
          <TabsTrigger value="upcoming">Sắp tới</TabsTrigger>
          <TabsTrigger value="exclusive">Độc quyền</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {currentPromotions.map((promo) => (
              <PromotionCard key={promo.id} promotion={promo} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingPromotions.map((promo) => (
              <PromotionCard key={promo.id} promotion={promo} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exclusive">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exclusivePromotions.map((promo) => (
              <PromotionCard key={promo.id} promotion={promo} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Combo tiết kiệm</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {combos.map((combo) => (
            <Card key={combo.id} className="overflow-hidden">
              <div className="relative h-48">
                <img src={combo.image || "/placeholder.svg"} alt={combo.name} className="h-full w-full object-cover" />
                <div className="absolute right-2 top-2">
                  <Badge className="bg-red-600">{combo.discount}</Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="mb-1 text-lg font-bold">{combo.name}</h3>
                <div className="mb-2 flex items-center">
                  <span className="text-lg font-bold text-red-600">${combo.price.toFixed(2)}</span>
                  <span className="ml-2 text-sm text-gray-500 line-through">${combo.originalPrice.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600">{combo.description}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button className="w-full bg-red-600 hover:bg-red-700" asChild>
                  <Link href={`/products?combo=${combo.id}`}>Đặt ngay</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="rounded-xl bg-gradient-to-r from-red-600 to-orange-500 p-8 text-white">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold">Đăng ký nhận thông báo khuyến mãi</h2>
              <p className="mb-6">
                Đừng bỏ lỡ các ưu đãi hấp dẫn! Đăng ký ngay để nhận thông báo về các khuyến mãi mới nhất từ FastBite.
              </p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Email của bạn"
                  className="w-full rounded-l-md border-0 px-4 py-2 text-gray-900 focus:outline-none"
                />
                <Button className="rounded-l-none bg-gray-900 hover:bg-gray-800">Đăng ký</Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <img
                src="/placeholder.svg?height=200&width=300&text=Promotion"
                alt="Promotion"
                className="max-h-48 rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

interface Promotion {
  id: number
  title: string
  description: string
  image: string
  code: string
  validUntil: string
  terms: string[]
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-48">
        <img src={promotion.image || "/placeholder.svg"} alt={promotion.title} className="h-full w-full object-cover" />
      </div>
      <CardContent className="p-4">
        <h3 className="mb-2 text-xl font-bold">{promotion.title}</h3>
        <p className="mb-4 text-sm text-gray-600">{promotion.description}</p>
        <div className="mb-4 flex items-center justify-between rounded-md bg-gray-100 p-2">
          <code className="font-bold text-red-600">{promotion.code}</code>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="mr-1 h-4 w-4" />
          <span>Có hiệu lực đến: {promotion.validUntil}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start border-t p-4">
        <p className="mb-2 text-sm font-medium">Điều kiện áp dụng:</p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-gray-600">
          {promotion.terms.map((term, index) => (
            <li key={index}>{term}</li>
          ))}
        </ul>
        <Button className="w-full bg-red-600 hover:bg-red-700" asChild>
          <Link href="/products">
            <ExternalLink className="mr-2 h-4 w-4" /> Sử dụng ngay
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

const currentPromotions: Promotion[] = [
  {
    id: 1,
    title: "Giảm 20% cho đơn hàng đầu tiên",
    description: "Áp dụng cho khách hàng mới. Giảm 20% cho đơn hàng đầu tiên của bạn.",
    image: "/placeholder.svg?height=200&width=400&text=20%+OFF",
    code: "WELCOME20",
    validUntil: "31/12/2023",
    terms: [
      "Áp dụng cho đơn hàng từ 100.000đ",
      "Chỉ áp dụng cho khách hàng mới",
      "Không áp dụng cùng các khuyến mãi khác",
    ],
  },
  {
    id: 2,
    title: "Combo tiết kiệm - Mua 1 tặng 1",
    description: "Mua 1 burger bất kỳ và nhận miễn phí 1 nước ngọt cỡ vừa.",
    image: "/placeholder.svg?height=200&width=400&text=Buy+1+Get+1",
    code: "B1G1DRINK",
    validUntil: "15/11/2023",
    terms: [
      "Áp dụng cho tất cả các loại burger",
      "Nước ngọt cỡ vừa (không áp dụng cho các loại đồ uống đặc biệt)",
      "Chỉ áp dụng khi dùng tại cửa hàng",
    ],
  },
  {
    id: 3,
    title: "Freeship cho đơn hàng từ 150.000đ",
    description: "Miễn phí giao hàng cho đơn hàng từ 150.000đ trong phạm vi 5km.",
    image: "/placeholder.svg?height=200&width=400&text=Free+Shipping",
    code: "FREESHIP",
    validUntil: "31/12/2023",
    terms: [
      "Áp dụng cho đơn hàng từ 150.000đ",
      "Phạm vi giao hàng trong bán kính 5km",
      "Có thể áp dụng cùng các khuyến mãi khác",
    ],
  },
]

const upcomingPromotions: Promotion[] = [
  {
    id: 4,
    title: "Black Friday - Giảm 30%",
    description: "Nhân dịp Black Friday, giảm 30% cho tất cả các đơn hàng.",
    image: "/placeholder.svg?height=200&width=400&text=Black+Friday",
    code: "BLACK30",
    validUntil: "24/11/2023 - 26/11/2023",
    terms: [
      "Áp dụng cho tất cả các đơn hàng",
      "Không áp dụng cùng các khuyến mãi khác",
      "Chỉ áp dụng trong 3 ngày Black Friday",
    ],
  },
  {
    id: 5,
    title: "Sinh nhật FastBite - Giảm 50%",
    description: "Nhân dịp sinh nhật 5 năm, FastBite giảm 50% cho tất cả các món.",
    image: "/placeholder.svg?height=200&width=400&text=Birthday+Sale",
    code: "BDAY50",
    validUntil: "15/12/2023",
    terms: ["Áp dụng cho tất cả các món ăn", "Không áp dụng cho đồ uống", "Chỉ áp dụng trong ngày 15/12/2023"],
  },
]

const exclusivePromotions: Promotion[] = [
  {
    id: 6,
    title: "VIP Member - Giảm 15% mỗi đơn hàng",
    description: "Dành riêng cho thành viên VIP. Giảm 15% cho mỗi đơn hàng.",
    image: "/placeholder.svg?height=200&width=400&text=VIP+Member",
    code: "VIP15",
    validUntil: "31/12/2023",
    terms: [
      "Chỉ áp dụng cho thành viên VIP",
      "Áp dụng cho tất cả các đơn hàng",
      "Có thể áp dụng cùng các khuyến mãi khác",
    ],
  },
  {
    id: 7,
    title: "Sinh nhật của bạn - Burger miễn phí",
    description: "Nhận một burger miễn phí trong ngày sinh nhật của bạn.",
    image: "/placeholder.svg?height=200&width=400&text=Birthday+Gift",
    code: "BDAYGIFT",
    validUntil: "Trong ngày sinh nhật của bạn",
    terms: [
      "Áp dụng trong ngày sinh nhật (cần xuất trình CMND/CCCD)",
      "Áp dụng cho một burger cơ bản",
      "Chỉ áp dụng khi dùng tại cửa hàng",
    ],
  },
]

const combos = [
  {
    id: 1,
    name: "Combo Gia Đình",
    description: "2 burger, 2 pizza nhỏ, 4 nước ngọt và 2 khoai tây chiên",
    price: 29.99,
    originalPrice: 39.99,
    discount: "-25%",
    image: "/placeholder.svg?height=200&width=300&text=Family+Combo",
  },
  {
    id: 2,
    name: "Combo Đôi",
    description: "2 burger, 2 nước ngọt và 1 khoai tây chiên lớn",
    price: 15.99,
    originalPrice: 19.99,
    discount: "-20%",
    image: "/placeholder.svg?height=200&width=300&text=Couple+Combo",
  },
  {
    id: 3,
    name: "Combo Trẻ Em",
    description: "1 burger nhỏ, 1 nước ngọt nhỏ, 1 khoai tây chiên nhỏ và 1 đồ chơi",
    price: 7.99,
    originalPrice: 9.99,
    discount: "-20%",
    image: "/placeholder.svg?height=200&width=300&text=Kids+Combo",
  },
  {
    id: 4,
    name: "Combo Party",
    description: "4 burger, 2 pizza lớn, 6 nước ngọt và 3 khoai tây chiên lớn",
    price: 49.99,
    originalPrice: 65.99,
    discount: "-24%",
    image: "/placeholder.svg?height=200&width=300&text=Party+Combo",
  },
]

