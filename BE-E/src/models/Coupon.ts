import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Promotion } from "./Promotion";

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ name: "promotion_id" })
  promotionId: number;

  @ManyToOne(() => Promotion, promotion => promotion.coupons)
  @JoinColumn({ name: "promotion_id" })
  promotion: Promotion;

  @Column({ name: "usage_limit", default: 1 })
  usageLimit: number;

  @Column({ name: "usage_count", default: 0 })
  usageCount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
} 