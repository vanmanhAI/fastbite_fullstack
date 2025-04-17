"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { Search, ShoppingCart, User, Menu, X, LogIn, Home, Pizza, Info, Phone, LogOut } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"

// Định nghĩa danh mục thực đơn
const categories = [
  {
    title: "Pizza",
    description: "Các loại bánh pizza truyền thống và đặc biệt",
    href: "/products?category=pizza",
  },
  {
    title: "Burger",
    description: "Burger thịt bò, gà và chay nhiều hương vị",
    href: "/products?category=burger",
  },
  {
    title: "Món ăn nhanh",
    description: "Gà rán, khoai tây chiên và các món ăn nhanh khác",
    href: "/products?category=fast-food",
  },
  {
    title: "Đồ uống",
    description: "Nước ngọt, nước ép và các loại thức uống khác",
    href: "/products?category=drinks",
  },
  {
    title: "Tráng miệng",
    description: "Bánh ngọt, kem và các món tráng miệng",
    href: "/products?category=desserts",
  },
  {
    title: "Xem tất cả",
    description: "Xem toàn bộ danh mục sản phẩm",
    href: "/products",
  },
]

export default function Header() {
  const isMobile = useMobile()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  const { user, isAuthenticated, logout } = useAuth()
  
  const { cartItems, totalItems } = useCart()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled ? "bg-white shadow-md dark:bg-gray-900" : "bg-white/80 backdrop-blur-sm dark:bg-gray-900/80",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="rounded-full bg-red-600 p-1.5">
              <Pizza className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">FastBite</span>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href="/" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>Trang chủ</NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Thực đơn</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {categories.map((category) => (
                        <li key={category.title}>
                          <NavigationMenuLink asChild>
                            <a
                              href={category.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">{category.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                {category.description}
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/promotions" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>Khuyến mãi</NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/about" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>Về chúng tôi</NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/contact" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>Liên hệ</NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* Search */}
            {!isMobile ? (
              <div className={cn("relative transition-all duration-200 ease-in-out", isSearchOpen ? "w-64" : "w-10")}>
                {isSearchOpen ? (
                  <div className="flex items-center">
                    <Input
                      placeholder="Tìm kiếm món ăn..."
                      className="pr-8"
                      autoFocus
                      onBlur={() => setIsSearchOpen(false)}
                    />
                    <X
                      className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400"
                      onClick={() => setIsSearchOpen(false)}
                    />
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/search">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
            )}

            {/* Cart */}
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* User Menu */}
            {!isMobile && (
              <>
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative rounded-full">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-medium">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile">Thông tin tài khoản</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/orders">Đơn hàng của tôi</Link>
                      </DropdownMenuItem>
                      {user?.role === "admin" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin">Quản trị hệ thống</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/login">
                      <LogIn className="h-5 w-5" />
                    </Link>
                  </Button>
                )}
              </>
            )}

            {/* Mobile Menu */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col space-y-3">
                    <SheetClose asChild>
                      <Link href="/" className="flex items-center rounded-md px-4 py-2 hover:bg-accent">
                        <Home className="mr-2 h-5 w-5" />
                        Trang chủ
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/products" className="flex items-center rounded-md px-4 py-2 hover:bg-accent">
                        <Pizza className="mr-2 h-5 w-5" />
                        Thực đơn
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/promotions" className="flex items-center rounded-md px-4 py-2 hover:bg-accent">
                        <span className="mr-2 flex h-5 w-5 items-center justify-center font-bold">%</span>
                        Khuyến mãi
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/about" className="flex items-center rounded-md px-4 py-2 hover:bg-accent">
                        <Info className="mr-2 h-5 w-5" />
                        Về chúng tôi
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/contact" className="flex items-center rounded-md px-4 py-2 hover:bg-accent">
                        <Phone className="mr-2 h-5 w-5" />
                        Liên hệ
                      </Link>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

