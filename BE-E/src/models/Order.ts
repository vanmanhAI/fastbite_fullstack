import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { User } from "./User";
import { OrderItem } from "./OrderItem";
import { Review } from "./Review";
import { Payment } from "./Payment";
import { Address } from "./Address";

export enum OrderStatus {
  PENDING = "pending",        // Đơn hàng vừa đặt, chờ admin phê duyệt
  APPROVED = "approved",      // Admin đã phê duyệt đơn hàng
  REJECTED = "rejected",      // Admin từ chối đơn hàng
  PROCESSING = "processing",  // Đơn hàng đang được xử lý
  SHIPPING = "shipping",      // Đơn hàng đang vận chuyển
  DELIVERED = "delivered",    // Đơn hàng đã được giao
  COMPLETED = "completed",    // Khách hàng đã xác nhận nhận hàng, đơn hàng hoàn tất
  CANCELLED = "cancelled"     // Đơn hàng bị hủy
}

export enum PaymentStatus {
  PENDING = "pending",        // Chờ thanh toán
  COMPLETED = "completed",    // Đã thanh toán
  FAILED = "failed",          // Thanh toán thất bại
  REFUNDED = "refunded"       // Đã hoàn tiền
}

export enum PaymentMethod {
  COD = "cod",
  STRIPE = "stripe",
  MOMO = "momo",
  VNPAY = "vnpay"
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ name: "user_id", nullable: true })
  userId!: number;

  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "address_id", nullable: true })
  addressId!: number;

  @ManyToOne(() => Address, address => address.orders)
  @JoinColumn({ name: "address_id" })
  address!: Address;

  @Column({ name: "subtotal", type: "decimal", precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ name: "shipping_fee", type: "decimal", precision: 10, scale: 2 })
  shippingFee!: number;

  @Column({ name: "discount", type: "decimal", precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status!: OrderStatus;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus!: PaymentStatus;

  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.COD
  })
  paymentMethod!: PaymentMethod;

  @Column({ name: "coupon_code", nullable: true })
  couponCode!: string;

  @Column({ name: "delivery_address", type: "text", nullable: true })
  deliveryAddress!: string;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ nullable: true })
  shippingAddress!: string;

  @Column({ nullable: true })
  shippingPhone!: string;

  @Column({ nullable: true })
  note!: string;

  @Column({ nullable: true })
  cancelReason!: string;

  @Column({ type: "datetime", nullable: true })
  approvedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  shippedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  deliveredAt!: Date;

  @Column({ type: "datetime", nullable: true })
  completedAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  orderItems!: OrderItem[];

  @OneToMany(() => Review, review => review.order)
  reviews!: Review[];

  @OneToMany(() => Payment, payment => payment.order)
  payments!: Payment[];
} 