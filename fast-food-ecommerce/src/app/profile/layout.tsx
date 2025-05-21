"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { User, Heart, Package, LogOut } from "lucide-react"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/profile")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          <nav className="space-y-1">
            <Link
              href="/profile"
              className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <User className="mr-3 h-5 w-5" />
              Thông tin tài khoản
            </Link>
            <Link
              href="/orders"
              className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <Package className="mr-3 h-5 w-5" />
              Đơn hàng của tôi
            </Link>
            <Link
              href="/profile/favorites"
              className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <Heart className="mr-3 h-5 w-5" />
              Sản phẩm yêu thích
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Đăng xuất
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-white rounded-lg p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  )
} 