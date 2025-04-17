import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Clock, MapPin, Phone, Mail, Users, Utensils, Truck, ThumbsUp } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Về FastBite</h1>
        <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-600">
          Chúng tôi là chuỗi nhà hàng đồ ăn nhanh với sứ mệnh mang đến những bữa ăn ngon miệng, chất lượng và tiện lợi
          cho khách hàng.
        </p>
        <div className="relative h-[400px] overflow-hidden rounded-xl">
          <img
            src="/placeholder.svg?height=400&width=1200&text=Restaurant+Interior"
            alt="FastBite Restaurant"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h2 className="text-4xl font-bold text-white">Phục vụ từ năm 2010</h2>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="mb-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold">Câu chuyện của chúng tôi</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                FastBite được thành lập vào năm 2010 bởi hai người bạn đại học với niềm đam mê ẩm thực và mong muốn mang
                đến những món ăn nhanh nhưng vẫn đảm bảo chất lượng và hương vị.
              </p>
              <p>
                Từ một cửa hàng nhỏ ở Quận 1, TP. Hồ Chí Minh, chúng tôi đã phát triển thành chuỗi nhà hàng với hơn 20
                chi nhánh trên toàn quốc, phục vụ hàng ngàn khách hàng mỗi ngày.
              </p>
              <p>
                Chúng tôi tự hào về việc sử dụng nguyên liệu tươi ngon, chế biến tại chỗ và luôn đặt sự hài lòng của
                khách hàng lên hàng đầu.
              </p>
            </div>
            <Button className="mt-6 bg-red-600 hover:bg-red-700" asChild>
              <Link href="/contact">Liên hệ với chúng tôi</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="/placeholder.svg?height=300&width=300&text=Chef+Cooking"
              alt="Chef cooking"
              className="rounded-lg object-cover"
            />
            <img
              src="/placeholder.svg?height=300&width=300&text=Fresh+Ingredients"
              alt="Fresh ingredients"
              className="rounded-lg object-cover"
            />
            <img
              src="/placeholder.svg?height=300&width=300&text=Restaurant+Team"
              alt="Our team"
              className="rounded-lg object-cover"
            />
            <img
              src="/placeholder.svg?height=300&width=300&text=Happy+Customers"
              alt="Happy customers"
              className="rounded-lg object-cover"
            />
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Giá trị cốt lõi của chúng tôi</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <Utensils className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Chất lượng</h3>
              <p className="text-gray-600">
                Chúng tôi cam kết sử dụng nguyên liệu tươi ngon nhất và quy trình chế biến đảm bảo vệ sinh an toàn thực
                phẩm.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <Truck className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Tốc độ</h3>
              <p className="text-gray-600">
                Chúng tôi hiểu giá trị thời gian của bạn và cam kết giao hàng nhanh chóng mà không ảnh hưởng đến chất
                lượng.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Con người</h3>
              <p className="text-gray-600">
                Đội ngũ nhân viên thân thiện, chuyên nghiệp luôn sẵn sàng phục vụ và mang đến trải nghiệm tốt nhất cho
                khách hàng.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <ThumbsUp className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Sự hài lòng</h3>
              <p className="text-gray-600">
                Chúng tôi không ngừng cải tiến để đảm bảo mỗi khách hàng đều hài lòng với sản phẩm và dịch vụ của chúng
                tôi.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Our Team */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Đội ngũ của chúng tôi</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {teamMembers.map((member) => (
            <div key={member.name} className="text-center">
              <div className="mb-4 overflow-hidden rounded-full">
                <img
                  src={member.image || "/placeholder.svg"}
                  alt={member.name}
                  className="h-48 w-48 object-cover mx-auto"
                />
              </div>
              <h3 className="mb-1 text-xl font-bold">{member.name}</h3>
              <p className="mb-2 text-red-600">{member.position}</p>
              <p className="text-gray-600">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Info */}
      <section className="rounded-xl bg-gray-50 p-8">
        <h2 className="mb-6 text-center text-3xl font-bold">Thông tin liên hệ</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3">
              <MapPin className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 font-bold">Địa chỉ</h3>
            <p className="text-gray-600">123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3">
              <Phone className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 font-bold">Điện thoại</h3>
            <p className="text-gray-600">(028) 3823 4567</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3">
              <Mail className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 font-bold">Email</h3>
            <p className="text-gray-600">info@fastbite.com</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 font-bold">Giờ mở cửa</h3>
            <p className="text-gray-600">Hàng ngày: 10:00 - 22:00</p>
          </div>
        </div>
      </section>
    </div>
  )
}

const teamMembers = [
  {
    name: "Nguyễn Văn An",
    position: "Nhà sáng lập & CEO",
    image: "/placeholder.svg?height=300&width=300&text=CEO",
    bio: "Với hơn 15 năm kinh nghiệm trong ngành ẩm thực, anh An là người đặt nền móng cho thương hiệu FastBite.",
  },
  {
    name: "Trần Thị Bình",
    position: "Bếp trưởng",
    image: "/placeholder.svg?height=300&width=300&text=Chef",
    bio: "Chef Bình tốt nghiệp từ Học viện Ẩm thực Paris và mang đến những công thức độc đáo cho FastBite.",
  },
  {
    name: "Lê Minh Cường",
    position: "Giám đốc Marketing",
    image: "/placeholder.svg?height=300&width=300&text=Marketing",
    bio: "Anh Cường chịu trách nhiệm xây dựng thương hiệu và các chiến dịch marketing của FastBite.",
  },
  {
    name: "Phạm Thị Dung",
    position: "Giám đốc Vận hành",
    image: "/placeholder.svg?height=300&width=300&text=Operations",
    bio: "Chị Dung đảm bảo mọi hoạt động của FastBite diễn ra trơn tru và hiệu quả.",
  },
]

