import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";

@Entity("chat_logs")
export class ChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", nullable: true })
  userId: number | null;

  @ManyToOne(() => User, user => user.chatLogs)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "text", nullable: true })
  response: string;

  @Column({ length: 100, nullable: true })
  intent: string;

  @Column({ name: "session_id", length: 100, default: 'default' })
  sessionId: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
} 