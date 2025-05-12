import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { initializeDatabase } from "./config/database";
import { initSocketService } from "./services/socketService";

// Routes
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import orderRoutes from "./routes/orderRoutes";
import addressRoutes from "./routes/addressRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import promotionRoutes from "./routes/promotionRoutes";
import chatRoutes from "./routes/chatRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import authRoutes from "./routes/authRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";
import userPreferenceRoutes from "./routes/userPreferenceRoutes";
import adminRoutes from "./routes/adminRoutes";
import cartRoutes from "./routes/cartRoutes";
import chatbotRoutes from "./routes/chatbotRoutes";

// Load environment variables
dotenv.config();

// Initialize database connection
initializeDatabase()
  .then(() => {
    console.log("Database connected successfully");
    if (process.env.RUN_MIGRATIONS === "true") {
      console.log("Migrations have been applied. Check logs for details.");
    } else {
      console.log("Migrations are disabled. Set RUN_MIGRATIONS=true in .env to enable.");
      console.log("Or run migrations manually with: npm run migration:run");
    }
  })
  .catch((err) => console.error("Database connection error:", err));

// Create Express app
const app = express();
const PORT = process.env.PORT || 8001;

// Create HTTP server and initialize Socket.IO
const httpServer = createServer(app);
initSocketService(httpServer);

// Cấu hình CORS cho phép frontend gọi API
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "http://localhost:3001",
    process.env.FRONTEND_URL || "*"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// Middleware đặc biệt cho Stripe webhook - phải đặt trước express.json()
app.use("/api/payments/stripe/webhook", express.raw({ type: 'application/json' }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/user-preferences", userPreferenceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Base route
app.get("/", (req, res) => {
  res.send("FastBite API đang chạy");
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Đã xảy ra lỗi trên server",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

export default app; 