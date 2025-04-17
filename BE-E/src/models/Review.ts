import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Product } from "./Product";
import { Order } from "./Order";

@Entity("reviews")
export class Review {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ name: "product_id" })
  productId!: number;

  @ManyToOne(() => Product, product => product.reviews)
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ name: "user_id" })
  userId!: number;

  @ManyToOne(() => User, user => user.reviews)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "order_id", nullable: true })
  orderId!: number | null;

  @ManyToOne(() => Order, order => order.reviews)
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ type: "tinyint" })
  rating!: number;

  @Column({ type: "text", nullable: true })
  comment!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
} 