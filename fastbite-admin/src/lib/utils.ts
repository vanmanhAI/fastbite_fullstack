import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Kết hợp nhiều class names lại với nhau, xử lý xung đột Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Định dạng giá tiền theo chuẩn Việt Nam
 * @param price Giá tiền cần định dạng
 * @returns Chuỗi giá tiền đã định dạng
 */
export function formatPrice(price: number): string {
  // Làm tròn giá trị để loại bỏ phần thập phân
  const roundedPrice = Math.round(price);
  return roundedPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
}
