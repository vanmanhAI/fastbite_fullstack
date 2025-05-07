"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

// Data mẫu cho biểu đồ
const salesData = [
  { name: "T1", value: 15200000 },
  { name: "T2", value: 18500000 },
  { name: "T3", value: 17300000 },
  { name: "T4", value: 21800000 },
  { name: "T5", value: 20400000 },
  { name: "T6", value: 25600000 },
  { name: "T7", value: 28900000 },
  { name: "T8", value: 32100000 },
  { name: "T9", value: 30500000 },
  { name: "T10", value: 33600000 },
  { name: "T11", value: 31200000 },
  { name: "T12", value: 35240000 },
];

const productSalesData = [
  { name: "Burger", value: 9500000 },
  { name: "Pizza", value: 8200000 },
  { name: "Gà rán", value: 7800000 },
  { name: "Mì Ý", value: 5400000 },
  { name: "Đồ uống", value: 4340000 },
];

const orderStatusData = [
  { name: "Hoàn thành", value: 120, color: "#10b981" },
  { name: "Đang giao", value: 26, color: "#6366f1" },
  { name: "Đang xử lý", value: 12, color: "#f59e0b" },
];

// Format số tiền thành đơn vị VND
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

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
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem('fastbite_admin_token');
      setToken(storedToken);
      
      // Lấy API URL từ env
      setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api');
    }
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

      <Card className="bg-white rounded-lg shadow">
        <CardHeader>
          <CardTitle>Doanh thu theo tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${value / 1000000}tr`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Doanh thu" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white rounded-lg shadow">
          <CardHeader>
            <CardTitle>Doanh thu theo sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productSalesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value / 1000000}tr`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" name="Doanh thu" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white rounded-lg shadow">
          <CardHeader>
            <CardTitle>Trạng thái đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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