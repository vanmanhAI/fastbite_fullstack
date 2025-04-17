import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, ManyToMany } from "typeorm";
import { Product } from "./Product";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ name: "image_url", length: 255, nullable: true })
  imageUrl: string;

  @Column({ name: "parent_id", nullable: true })
  parentId: number | null;

  @ManyToOne(() => Category, category => category.children)
  @JoinColumn({ name: "parent_id" })
  parent: Category;

  @OneToMany(() => Category, category => category.parent)
  children: Category[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToMany(() => Product, product => product.categories)
  products: Product[];
} 