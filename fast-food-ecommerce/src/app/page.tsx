"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button"
import ProductCard from "@/components/product-card"
import CategorySection from "@/components/category-section"
import PromotionBanner from "@/components/promotion-banner"
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
      {/* Hero Section */}
      <section className="relative h-[500px] bg-gradient-to-r from-orange-500 to-red-600 flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-xl text-white">
            <h1 className="text-5xl font-bold mb-4">Delicious Fast Food Delivered Fast</h1>
            <p className="text-xl mb-8">
              Order your favorite meals with just a few clicks and enjoy our AI-powered recommendations
            </p>
            <Link href="/products">
              <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100">
                Đặt hàng ngay
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 h-full w-1/2 hidden lg:block">
          <img
            src="/images/hero-burger.jpg"
            alt="Delicious burger"
            className="object-cover h-full w-full"
          />
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Danh mục</h2>
          <CategorySection />
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Món ăn nổi bật</h2>
          
          {loading ? (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={() => addToCart(product)}
                />
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <Link href="/products">
              <Button className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark">
                Xem tất cả sản phẩm
              </Button>
            </Link>
          </div>
        </div>
      </section>

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

