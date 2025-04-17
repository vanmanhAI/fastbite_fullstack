// Cấu hình API URL dựa trên môi trường
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

// Cấu hình cho Stripe
export const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || ''; 