import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { Order } from "./Order";

export enum PaymentMethod {
  COD = "cod",
  STRIPE = "stripe",
  MOMO = "momo",
  VNPAY = "vnpay"
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded"
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "order_id" })
  orderId!: number;

  @ManyToOne(() => Order, order => order.payments)
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({
    type: "enum",
    enum: PaymentMethod
  })
  method!: PaymentMethod;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status!: PaymentStatus;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2
  })
  amount!: number;

  @Column({ name: "transaction_id", type: "varchar", length: 255, nullable: true })
  transactionId!: string | null;
  
  @Column({ name: "payment_intent_id", type: "varchar", length: 255, nullable: true })
  paymentIntentId!: string | null;
  
  @Column({ name: "stripe_session_id", type: "varchar", length: 255, nullable: true })
  stripeSessionId!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 