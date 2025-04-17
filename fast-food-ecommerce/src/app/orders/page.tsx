'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserOrders } from '@/services/orderService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingBag, PackageOpen, ArrowLeft, ArrowRight } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
      return;
    }
    
    fetchOrders(1);
  }, [isAuthenticated, router]);
  
  const fetchOrders = async (page: number) => {
    try {
      setLoading(true);
      const response = await getUserOrders(page, 10);
      setOrders(response.orders);
      setCurrentPage(page);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đơn hàng:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách đơn hàng',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipping: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    const statusText = {
      pending: 'Chờ xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy'
    };
    
    return (
      <Badge className={statusStyles[status] || 'bg-gray-100 text-gray-800'}>
        {statusText[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-8">Đơn hàng của tôi</h1>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8">Đơn hàng của tôi</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Chưa có đơn hàng nào</h2>
          <p className="text-gray-500 mb-6">Hãy tìm kiếm các món ăn yêu thích và đặt hàng ngay!</p>
          <Link href="/products">
            <Button size="lg">Khám phá menu</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <CardTitle className="mb-1">Đơn hàng #{order.id}</CardTitle>
                      <p className="text-sm text-gray-500">
                        Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm">Xem chi tiết</Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {order.orderItems && order.orderItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <div>
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-sm text-gray-500"> x{item.quantity}</span>
                        </div>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    
                    {order.orderItems && order.orderItems.length > 3 && (
                      <p className="text-sm text-gray-500">
                        +{order.orderItems.length - 3} sản phẩm khác
                      </p>
                    )}
                    
                    <div className="flex justify-between pt-3 border-t font-bold">
                      <span>Tổng cộng:</span>
                      <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => fetchOrders(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Trang trước
              </Button>
              <span className="mx-4 flex items-center">
                Trang {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => fetchOrders(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Trang sau
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 