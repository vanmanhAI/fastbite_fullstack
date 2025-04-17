import { DataSource } from "typeorm";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Review } from "../models/Review";
import { Address } from "../models/Address";
import { Promotion } from "../models/Promotion";
import { Coupon } from "../models/Coupon";
import { ChatLog } from "../models/ChatLog";
import { InventoryTransaction } from "../models/InventoryTransaction";
import { Payment } from "../models/Payment";
import { config } from 'dotenv';

// Đọc biến môi trường từ file .env
config();

// Create a new DataSource (previously EntityManager)
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "InternLOL123.",
  database: process.env.DB_DATABASE || "fastbite_db",
  synchronize: true, // Chỉ dùng trong môi trường development
  logging: process.env.NODE_ENV === "development",
  entities: [
    User,
    Product,
    Category,
    Order,
    OrderItem,
    Review,
    Address,
    Promotion,
    Coupon,
    ChatLog,
    InventoryTransaction,
    Payment
  ],
  subscribers: [],
  migrations: [],
});

// Initialize the connection
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    return AppDataSource;
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
}; 