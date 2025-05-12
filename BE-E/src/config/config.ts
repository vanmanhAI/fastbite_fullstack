import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

interface Config {
  port: number;
  jwtSecret: string;
  jwtExpiration: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  uploadsDir: string;
  frontendUrl: string;
  adminUrl: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '1d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'InternLOL123.',
    database: process.env.DB_DATABASE || 'fastbite_db',
  }
}; 