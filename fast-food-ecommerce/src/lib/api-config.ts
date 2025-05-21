// Cấu hình API URL dựa trên môi trường
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

// Cấu hình backend URL cho chatbot và đề xuất
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8001';

// Cấu hình cho Stripe
export const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || '';

// Cấu hình cho chatbot
export const CHATBOT_CONFIG = {
  aiEnabled: process.env.NEXT_PUBLIC_AI_ENABLED === 'true',
  maxHistoryLength: parseInt(process.env.NEXT_PUBLIC_MAX_CHAT_HISTORY || '10'),
  useBackend: process.env.NEXT_PUBLIC_USE_BACKEND === 'true',
  sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '30'), // phút
  tokenStorageKey: 'token' // Key lưu token trong localStorage
}; 