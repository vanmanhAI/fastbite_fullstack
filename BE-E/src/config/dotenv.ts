import { config } from 'dotenv';
import path from 'path';

// Load .env từ thư mục gốc
config({
  path: path.resolve(process.cwd(), '.env')
});

// Đảm bảo các biến môi trường bắt buộc
const requiredEnvVars = [
  'PORT',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'JWT_SECRET'
];

// Biến môi trường tùy chọn với giá trị mặc định
const optionalEnvVars: { [key: string]: string } = {
  'NODE_ENV': 'development',
  'LOG_LEVEL': 'info',
  'CORS_ORIGIN': '*',
  'REDIS_URL': '',
  'GEMINI_API_KEY': '' // Thêm API key cho Google Gemini
};

// Kiểm tra biến môi trường bắt buộc
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Thiết lập biến môi trường tùy chọn nếu chưa có
Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
  if (!process.env[key]) {
    process.env[key] = defaultValue;
  }
});

// Export các biến môi trường
export default {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  cors: {
    origin: process.env.CORS_ORIGIN
  },
  redis: {
    url: process.env.REDIS_URL
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  }
}; 