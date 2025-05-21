import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface QuantitySelectorProps {
  initialQuantity?: number;
  maxQuantity: number; // Số lượng tồn kho tối đa
  onQuantityChange: (quantity: number) => void;
  className?: string;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  initialQuantity = 1,
  maxQuantity,
  onQuantityChange,
  className = '',
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Cập nhật giá trị ban đầu nếu có thay đổi từ props
    setQuantity(initialQuantity);
  }, [initialQuantity]);

  // Kiểm tra và xử lý số lượng
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      setQuantity(1);
      setError('Số lượng tối thiểu là 1');
      onQuantityChange(1);
      return;
    }
    
    if (newQuantity > maxQuantity) {
      setQuantity(maxQuantity);
      setError(`Chỉ còn ${maxQuantity} sản phẩm trong kho`);
      onQuantityChange(maxQuantity);
      return;
    }
    
    setQuantity(newQuantity);
    setError('');
    onQuantityChange(newQuantity);
  };

  // Xử lý khi người dùng nhập vào input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Nếu giá trị rỗng, không làm gì cả
    if (value === '') {
      setQuantity(0);
      setError('Vui lòng nhập số lượng');
      return;
    }
    
    // Chuyển đổi sang số và kiểm tra
    const newQuantity = parseInt(value, 10);
    
    // Kiểm tra nếu không phải số
    if (isNaN(newQuantity)) {
      setError('Vui lòng nhập số');
      return;
    }
    
    handleQuantityChange(newQuantity);
  };

  // Xử lý khi người dùng ấn nút tăng
  const handleIncrement = () => {
    handleQuantityChange(quantity + 1);
  };

  // Xử lý khi người dùng ấn nút giảm
  const handleDecrement = () => {
    handleQuantityChange(quantity - 1);
  };

  // Xử lý khi người dùng blur khỏi input
  const handleBlur = () => {
    // Nếu quantity = 0 (do người dùng xóa hết), reset về 1
    if (quantity === 0) {
      handleQuantityChange(1);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-r-none"
          onClick={handleDecrement}
          disabled={quantity <= 1}
        >
          <MinusIcon className="h-3 w-3" />
        </Button>
        <Input
          type="text"
          value={quantity}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="h-8 w-14 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-l-none"
          onClick={handleIncrement}
          disabled={quantity >= maxQuantity}
        >
          <PlusIcon className="h-3 w-3" />
        </Button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {quantity === maxQuantity && !error && (
        <p className="text-amber-500 text-xs mt-1">Đã đạt số lượng tối đa</p>
      )}
    </div>
  );
}; 