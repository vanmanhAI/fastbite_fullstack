"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Settings } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userAvatar, setUserAvatar] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Lấy thông tin người dùng từ localStorage khi component được mount
  useEffect(() => {
    // Kiểm tra nếu có thông tin user trong localStorage
    const userDataStr = localStorage.getItem('fastbite_admin_user');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setUserName(userData.name || 'Admin');
        // Nếu có avatar thì dùng, nếu không thì dùng chữ cái đầu tiên của tên
        setUserAvatar(userData.avatar || '');
      } catch (error) {
        console.error('Lỗi khi parse dữ liệu người dùng:', error);
      }
    }

    // Thêm event listener để đóng dropdown khi click ra ngoài
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Xóa token và thông tin người dùng từ localStorage
    localStorage.removeItem('fastbite_admin_token');
    localStorage.removeItem('fastbite_admin_user');
    
    // Chuyển hướng về trang đăng nhập
    router.push('/');
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "📊" },
    { name: "Sản phẩm", href: "/dashboard/products", icon: "🍔" },
    { name: "Đơn hàng", href: "/dashboard/orders", icon: "🛒" },
    { name: "Mã giảm giá", href: "/dashboard/coupons", icon: "🏷️" },
    { name: "Khách hàng", href: "/dashboard/customers", icon: "👥" },
    { name: "Cài đặt", href: "/dashboard/settings", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-16"
        } bg-white shadow-md transition-all duration-300 flex-shrink-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div
            className={`font-bold text-red-600 text-xl ${
              !isSidebarOpen && "hidden"
            }`}
          >
            FastBite Admin
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isSidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="mt-4">
          <ul>
            {navigation.map((item) => (
              <li key={item.name} className="mb-1">
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm ${
                    pathname === item.href
                      ? "bg-red-50 text-red-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  } transition-colors duration-200 ${
                    !isSidebarOpen && "justify-center"
                  }`}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  {isSidebarOpen && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="h-16 flex items-center justify-between px-6 bg-white shadow-sm">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {navigation.find((item) => item.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center space-x-4 relative" ref={userMenuRef}>
            <div 
              className="flex items-center space-x-2 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <span className="text-gray-700 hidden md:inline-block">{userName}</span>
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-medium shadow-md">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>

            {/* User dropdown menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 animate-in fade-in duration-100">
                <div className="py-1">
                  <a 
                    href="/dashboard/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    Hồ sơ cá nhân
                  </a>
                  <a 
                    href="/dashboard/settings" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 mr-2 text-gray-500" />
                    Cài đặt
                  </a>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 