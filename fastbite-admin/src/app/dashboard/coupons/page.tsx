"use client";

import { useState } from "react";
import Link from "next/link";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expiry: string;
  status: "active" | "expired" | "used";
  maxUses: number;
  currentUses: number;
  minPurchase: number;
}

export default function CouponsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  // Dữ liệu mẫu
  const coupons: Coupon[] = [
    {
      id: "CPT001",
      code: "WELCOME20",
      discountType: "percentage",
      discountValue: 20,
      expiry: "2025-12-31",
      status: "active",
      maxUses: 100,
      currentUses: 45,
      minPurchase: 100000
    },
    {
      id: "CPT002",
      code: "FASTBITE50K",
      discountType: "fixed",
      discountValue: 50000,
      expiry: "2025-06-30",
      status: "active",
      maxUses: 50,
      currentUses: 12,
      minPurchase: 200000
    },
    {
      id: "CPT003",
      code: "SUMMER25",
      discountType: "percentage",
      discountValue: 25,
      expiry: "2025-08-31",
      status: "active",
      maxUses: 200,
      currentUses: 87,
      minPurchase: 150000
    },
    {
      id: "CPT004",
      code: "TEST10",
      discountType: "percentage",
      discountValue: 10,
      expiry: "2024-12-31",
      status: "expired",
      maxUses: 20,
      currentUses: 5,
      minPurchase: 50000
    },
    {
      id: "CPT005",
      code: "FREESHIP",
      discountType: "fixed",
      discountValue: 30000,
      expiry: "2025-10-15",
      status: "active",
      maxUses: 300,
      currentUses: 150,
      minPurchase: 0
    }
  ];

  // Lọc mã giảm giá
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === "all" ||
      (filter === "active" && coupon.status === "active") ||
      (filter === "expired" && coupon.status === "expired") ||
      (filter === "used" && coupon.status === "used") ||
      (filter === "percentage" && coupon.discountType === "percentage") ||
      (filter === "fixed" && coupon.discountType === "fixed");
    
    return matchesSearch && matchesFilter;
  });

  // Format giá trị giảm giá
  const formatDiscountValue = (coupon: Coupon) => {
    if (coupon.discountType === "percentage") {
      return `${coupon.discountValue}%`;
    } else {
      return `${coupon.discountValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₫`;
    }
  };

  // Format số tiền
  const formatCurrency = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mã giảm giá</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách mã giảm giá</p>
        </div>
        <Link
          href="/dashboard/coupons/add"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Thêm mã giảm giá
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mã giảm giá..."
              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
            />
          </div>
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
            >
              <option value="all">Tất cả mã giảm giá</option>
              <option value="active">Đang hoạt động</option>
              <option value="expired">Đã hết hạn</option>
              <option value="used">Đã sử dụng hết</option>
              <option value="percentage">Giảm theo %</option>
              <option value="fixed">Giảm số tiền cố định</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã giảm giá
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảm giá
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lượt dùng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mua tối thiểu
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hạn sử dụng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-0">
                        <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                        <div className="text-sm text-gray-500">ID: {coupon.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      coupon.discountType === "percentage" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {formatDiscountValue(coupon)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coupon.currentUses} / {coupon.maxUses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coupon.minPurchase > 0 ? formatCurrency(coupon.minPurchase) : 'Không có'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(coupon.expiry).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      coupon.status === "active" ? "bg-green-100 text-green-800" : 
                      coupon.status === "expired" ? "bg-red-100 text-red-800" : 
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {coupon.status === "active" ? "Đang hoạt động" : 
                       coupon.status === "expired" ? "Đã hết hạn" : 
                       "Đã dùng hết"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-3">
                      <Link 
                        href={`/dashboard/coupons/edit/${coupon.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Sửa
                      </Link>
                      <button className="text-red-600 hover:text-red-900">
                        Xóa
                      </button>
                      {coupon.status === "active" && (
                        <button className="text-gray-600 hover:text-gray-900">
                          Vô hiệu hóa
                        </button>
                      )}
                      {coupon.status !== "active" && (
                        <button className="text-green-600 hover:text-green-900">
                          Kích hoạt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-medium">{filteredCoupons.length}</span> / <span className="font-medium">{coupons.length}</span> mã giảm giá
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Trước
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 