"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button"
import ProductCard from "@/components/product-card"
import CategorySection from "@/components/category-section"
import PromotionBanner from "@/components/promotion-banner"
import ProductBanner from "@/components/product-banner"
import CategoryBanner from "@/components/category-banner"
import ChatbotButton from "@/components/chatbot/chatbot-button"
import { getProducts } from '@/services/productService';
import { getActivePromotions } from '@/services/promotionService';
import { useCart } from '@/contexts/CartContext';
import LoadingSpinner from '@/components/loading-spinner';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Lấy sản phẩm nổi bật
        const productsResponse = await getProducts(1, 4, undefined, undefined, true);
        setFeaturedProducts(productsResponse.data);
        
        // Lấy khuyến mãi đang hoạt động
        const promotionsResponse = await getActivePromotions();
        setPromotions(promotionsResponse);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <main className="min-h-screen">
      {/* Product Banner - NEW */}
      <ProductBanner className="mt-8" />

      {/* Categories Banner - NEW */}
      <CategoryBanner className="bg-gray-50" />

      {/* Promotion Banner */}
      <PromotionBanner promotions={promotions} />

      {/* Chatbot Button (Fixed Position) */}
      <ChatbotButton />
    </main>
  )
}

// Sample data
const featuredProducts = [
  {
    id: 1,
    name: "Classic Cheeseburger",
    description: "Juicy beef patty with melted cheese, lettuce, tomato, and our special sauce",
    price: 8.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["popular", "beef"],
  },
  {
    id: 2,
    name: "Spicy Chicken Burger",
    description: "Crispy chicken fillet with spicy sauce, lettuce and pickles",
    price: 7.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["spicy", "chicken"],
  },
  {
    id: 3,
    name: "Vegetarian Pizza",
    description: "Fresh vegetables, mushrooms and mozzarella cheese on our signature crust",
    price: 12.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["vegetarian", "pizza"],
  },
  {
    id: 4,
    name: "Chocolate Milkshake",
    description: "Creamy chocolate milkshake topped with whipped cream",
    price: 4.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["drink", "dessert"],
  },
]

