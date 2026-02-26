// src/modules/books/entities/Book.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Author } from '../../authors/entities/Author';
import { Category } from '../../categories/entities/Category';
import { Publisher } from '../../publishers/entities/Publisher';
import { Reservation } from '../../reservations/entities/Reservation';
import { Copy } from '../../copies/entities/Copy';
import { Review } from '../../reviews/entities/Review';
import { BookStatus } from '../enums/book-status.enum';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  title!: string;

  @ManyToOne(() => Author, (a) => a.books, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'author_id' })
  author?: Author | null;

  @ManyToOne(() => Category, (c) => c.books, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category | null;

  @ManyToOne(() => Publisher, (p) => p.books, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'publisher_id' })
  publisher?: Publisher | null;

  @Column({ name: 'published_year', type: 'int', nullable: true })
  publishedYear?: number;

  // 💰 Giá sách (VND) dùng để tính tiền phạt khi mất/hư
  @Column({ type: 'int', unsigned: true, default: 0 })
  price!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({
    type: 'enum',
    enum: BookStatus,
    default: BookStatus.AVAILABLE,
  })
  status!: BookStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Copy, (c) => c.book)
  copies!: Copy[];

  @OneToMany(() => Reservation, (r) => r.book)
  reservations!: Reservation[];

  @OneToMany(() => Review, (r) => r.book)
  reviews!: Review[];

  // ⚠️ Virtual (không map DB)
  totalCopies?: number;

  // ✅ Virtual images, populate qua query riêng
  images?: Array<{
    id: number;
    url: string;
    publicId: string;
    format: string;
  }>;
}
