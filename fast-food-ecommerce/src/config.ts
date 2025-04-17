// API URL dựa vào môi trường
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Frontend URL
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Stripe publishable key
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || "";

// Các cấu hình khác
export const APP_NAME = "Fast Food";
export const APP_DESCRIPTION = "Đặt đồ ăn nhanh, tiện lợi"; 