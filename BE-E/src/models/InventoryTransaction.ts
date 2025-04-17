import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Product } from "./Product";

export enum TransactionType {
  IN = "in",
  OUT = "out",
  ADJUSTMENT = "adjustment"
}

@Entity("inventory_transactions")
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "product_id" })
  productId: number;

  @ManyToOne(() => Product, product => product.inventoryTransactions)
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column()
  quantity: number;

  @Column({
    type: "enum",
    enum: TransactionType
  })
  type: TransactionType;

  @Column({ name: "reference_id", nullable: true })
  referenceId: number | null;

  @Column({ name: "reference_type", length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: "text", nullable: true })
  notes: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
} 