import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  // Làm tròn giá trị để loại bỏ phần thập phân, đảm bảo đồng bộ với formatPrice
  const roundedAmount = Math.round(amount);
  return roundedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
}

export function formatPrice(price: number): string {
  // Làm tròn giá trị để loại bỏ phần thập phân
  const roundedPrice = Math.round(price);
  return roundedPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function getIdFromSlug(slug: string): number | null {
  if (!slug) return null;
  
  // Xử lý trường hợp slug có định dạng "product-name-123"
  const match = slug.match(/-(\d+)$/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  // Xử lý trường hợp slug đơn giản chỉ là id
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }
  
  return null;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + '...';
}
