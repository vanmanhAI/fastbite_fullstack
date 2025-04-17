"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: "35.240.000 ₫",
    totalOrders: "158",
    averageOrderValue: "223.000 ₫",
    pendingOrders: "12",
  });

  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // Kiểm tra token
    const storedToken = localStorage.getItem('fastbite_admin_token');
    setToken(storedToken);
    
    // Lấy API URL từ env
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api');
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái token</CardTitle>
          </CardHeader>
          <CardContent>
            {token ? (
              <div>
                <p className="text-green-600">Đã có token</p>
                <p className="text-xs mt-2 text-gray-500 overflow-hidden text-ellipsis">{token.substring(0, 20)}...</p>
              </div>
            ) : (
              <p className="text-red-600">Chưa có token</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API URL</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{apiUrl || 'Không có'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Doanh số</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-500 mr-1">↑ 12%</span>
            <span className="text-gray-500">so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Đơn hàng</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-500 mr-1">↑ 8%</span>
            <span className="text-gray-500">so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Giá trị trung bình</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.averageOrderValue}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-500 mr-1">↑ 3%</span>
            <span className="text-gray-500">so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Đang xử lý</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
          <div className="mt-2 text-sm">
            <Link href="/dashboard/orders" className="text-red-600 hover:underline">
              Xem đơn hàng
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Đơn hàng gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã đơn hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày đặt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #FBO{10245 + index}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Khách hàng {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(Date.now() - index * 86400000).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(Math.random() * 1000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₫
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${index % 3 === 0 ? "bg-yellow-100 text-yellow-800" : 
                        index % 3 === 1 ? "bg-green-100 text-green-800" : 
                        "bg-gray-100 text-gray-800"}`}>
                      {index % 3 === 0 ? "Đang xử lý" : 
                        index % 3 === 1 ? "Đã hoàn thành" : 
                        "Đang giao"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <Link href="/dashboard/orders" className="text-sm font-medium text-red-600 hover:text-red-500">
            Xem tất cả đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
} 