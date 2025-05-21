import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Product, likeProduct, checkProductLike } from '@/services/productService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import socketService from '@/services/socketService';
import recommendationService from '@/services/recommendationService';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(product.likeCount || 0);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    // Kiểm tra trạng thái like khi component được load
    const checkLikeStatus = async () => {
      if (isAuthenticated && product.id) {
        try {
          const result = await checkProductLike(product.id);
          setIsLiked(result.isLiked);
          setLikeCount(result.likeCount);
        } catch (error) {
          console.error('Lỗi khi kiểm tra trạng thái like:', error);
        }
      }
    };

    checkLikeStatus();
  }, [product.id, isAuthenticated]);

  useEffect(() => {
    // Đăng ký nhận cập nhật real-time về like
    if (typeof window === 'undefined' || !product.id) return;

    // Tham gia phòng sản phẩm
    socketService.joinProductRoom(product.id);

    // Lắng nghe sự kiện cập nhật like
    const unsubscribe = socketService.onProductLikeUpdate((data) => {
      setLikeCount(data.likeCount);
    });

    return () => {
      socketService.leaveProductRoom(product.id);
      unsubscribe();
    };
  }, [product.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: 'Bạn cần đăng nhập',
        description: 'Vui lòng đăng nhập để thích sản phẩm này',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await likeProduct(product.id);
      setIsLiked(result.isLiked);
      setLikeCount(result.likeCount);
      
      // Theo dõi hành vi like
      if (result.isLiked) {
        try {
          recommendationService.trackLikeProduct(product.id);
          console.log(`Đã gọi trackLikeProduct cho sản phẩm ID: ${product.id}`);
        } catch (error) {
          console.error("Lỗi khi theo dõi hành vi thích sản phẩm:", error);
        }
      }
    } catch (error) {
      console.error('Lỗi khi thích/bỏ thích sản phẩm:', error);
      toast({
        title: 'Có lỗi xảy ra',
        description: 'Không thể thích sản phẩm. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart(product, 1);
    
    // Theo dõi hành vi thêm vào giỏ
    try {
      recommendationService.trackAddToCart(product.id);
      console.log(`Đã gọi trackAddToCart cho sản phẩm ID: ${product.id}`);
    } catch (error) {
      console.error("Lỗi khi theo dõi hành vi thêm vào giỏ:", error);
    }
    
    toast({
      title: 'Đã thêm vào giỏ hàng',
      description: `${product.name} đã được thêm vào giỏ hàng`,
    });
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md">
        {/* Badge hiển thị khi có giảm giá */}
        {product.isFeatured && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Nổi bật
          </div>
        )}
        
        {/* Nút Like */}
        <button
          className="absolute top-2 right-2 z-10 rounded-full bg-white p-1.5 shadow-sm transition-colors hover:bg-gray-100"
          onClick={handleLike}
        >
          <Heart 
            className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
          />
        </button>
        
        {/* Hình ảnh sản phẩm */}
        <div className="aspect-square overflow-hidden">
          <img
            src={product.imageUrl || '/images/placeholder-food.jpg'}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
        
        {/* Thông tin sản phẩm */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 line-clamp-1">{product.name}</h3>
          
          <div className="mt-1 flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(product.rating || 0)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({product.numReviews || 0}) • {likeCount} lượt thích
            </span>
          </div>
          
          <div className="mt-1 text-sm text-gray-700 line-clamp-2">
            {product.description || 'Không có mô tả'}
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <p className="font-semibold text-primary">
              {formatCurrency(product.price)}
            </p>
            
            <Button
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={handleAddToCart}
              disabled={!product.stock || product.stock <= 0}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Thêm
            </Button>
          </div>

          {/* Trạng thái tồn kho */}
          {(!product.stock || product.stock <= 0) && (
            <div className="mt-2 text-center text-xs font-medium text-red-500">
              Hết hàng
            </div>
          )}
        </div>
      </div>
    </Link>
  );
} 