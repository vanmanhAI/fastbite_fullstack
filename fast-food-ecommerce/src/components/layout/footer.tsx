import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Pizza, ArrowRight } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div>
            <Link href="/" className="mb-4 flex items-center space-x-2">
              <div className="rounded-full bg-red-600 p-1.5">
                <Pizza className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">FastBite</span>
            </Link>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Chúng tôi cung cấp những món ăn nhanh ngon miệng, chất lượng với dịch vụ giao hàng nhanh chóng và tiện
              lợi.
            </p>
            <div className="flex space-x-3">
              <Button variant="outline" size="icon" className="rounded-full" asChild>
                <Link href="https://facebook.com" target="_blank">
                  <Facebook className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" asChild>
                <Link href="https://instagram.com" target="_blank">
                  <Instagram className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" asChild>
                <Link href="https://twitter.com" target="_blank">
                  <Twitter className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" asChild>
                <Link href="https://youtube.com" target="_blank">
                  <Youtube className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-bold">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Thực đơn
                </Link>
              </li>
              <li>
                <Link
                  href="/promotions"
                  className="text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Khuyến mãi
                </Link>
              </li>
              <li>
                <Link
                  href="/locations"
                  className="text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Cửa hàng
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-lg font-bold">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <MapPin className="mr-2 h-5 w-5 shrink-0 text-red-600" />
                <span className="text-gray-600 dark:text-gray-400">123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center">
                <Phone className="mr-2 h-5 w-5 text-red-600" />
                <span className="text-gray-600 dark:text-gray-400">(028) 3823 4567</span>
              </li>
              <li className="flex items-center">
                <Mail className="mr-2 h-5 w-5 text-red-600" />
                <span className="text-gray-600 dark:text-gray-400">info@fastbite.com</span>
              </li>
            </ul>
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium">Giờ mở cửa:</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hàng ngày: 10:00 - 22:00</p>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-lg font-bold">Đăng ký nhận tin</h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Đăng ký để nhận thông tin về khuyến mãi và món mới
            </p>
            <div className="flex space-x-2">
              <Input type="email" placeholder="Email của bạn" className="max-w-[220px]" />
              <Button className="bg-red-600 hover:bg-red-700">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between space-y-4 text-sm md:flex-row md:space-y-0">
          <p className="text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} FastBite. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex space-x-4">
            <Link href="/terms" className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
              Điều khoản sử dụng
            </Link>
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              Chính sách bảo mật
            </Link>
            <Link href="/faq" className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

