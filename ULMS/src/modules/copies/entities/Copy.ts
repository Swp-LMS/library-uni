import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Book } from '../../books/entities/Book';
import { BorrowDetail } from '../../borrowDetails/entities/BorrowDetail';
import { CopyStatus } from '../enums/copy-status.enum';

@Entity('copies')
export class Copy {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Book, (b) => b.copies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book!: Book;

  @Column({ type: 'enum', enum: CopyStatus, default: CopyStatus.AVAILABLE })
  status!: CopyStatus;

  @Column({ nullable: true })
  barcode!: string;

  @Column({ nullable: true })
  location!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => BorrowDetail, (bd) => bd.copy)
  borrowDetails!: BorrowDetail[];
}
