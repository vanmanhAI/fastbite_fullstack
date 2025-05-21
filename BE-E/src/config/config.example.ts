export default {
  port: parseInt(process.env.PORT || '5000'),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'your_stripe_webhook_secret',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'InternLOL123.',
    database: process.env.DB_DATABASE || 'fastbite_db',
  }
}; 