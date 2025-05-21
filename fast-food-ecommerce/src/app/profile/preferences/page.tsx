'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ChevronLeft, Info, Sparkles } from 'lucide-react';

export default function UserPreferencesPage() {
  const { user } = useAuth();
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Link href="/profile" className="inline-flex items-center mb-6 text-primary hover:underline">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Quay lại trang cá nhân
      </Link>
      
      <Card className="border-muted-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <CardTitle>Thông báo về tính năng Sở thích người dùng</CardTitle>
          </div>
          <CardDescription className="text-base pt-2">
            Chúng tôi đã nâng cấp hệ thống gợi ý sản phẩm
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Tính năng <strong>Sở thích người dùng</strong> đã được loại bỏ trong phiên bản mới nhất của ứng dụng.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r text-blue-700">
              <h3 className="font-medium flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Trải nghiệm được cải thiện
              </h3>
              <p className="mt-2">
                Thay vì yêu cầu bạn cập nhật sở thích thủ công, hệ thống mới sẽ tự động học từ hành vi của bạn để đưa ra những gợi ý cá nhân hóa chính xác hơn.
              </p>
            </div>
            
            <h3 className="text-lg font-medium text-foreground">Cách hoạt động của hệ thống gợi ý mới:</h3>
            
            <ul className="list-disc pl-5 space-y-2">
              <li>Hệ thống sẽ tự động ghi nhận các món ăn bạn đã xem, thích hoặc đặt mua</li>
              <li>Mỗi tương tác của bạn giúp hệ thống hiểu rõ hơn về khẩu vị và sở thích của bạn</li>
              <li>Với thời gian, gợi ý sẽ ngày càng chính xác và phù hợp hơn</li>
              <li>Bạn không cần thực hiện bất kỳ cài đặt nào - mọi thứ hoạt động tự động</li>
            </ul>
            
            <p className="mt-6">
              Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi. Chúng tôi luôn nỗ lực cải tiến trải nghiệm của bạn!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 