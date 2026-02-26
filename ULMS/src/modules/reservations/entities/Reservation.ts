import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/User';
import { Book } from '../../books/entities/Book';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { BorrowRecord } from '../../borrowRecords/entities/BorrowRecord';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (u: User) => u.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Book, (b: Book) => b.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book!: Book;

  @Column({ name: 'reserve_date', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  reserveDate!: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status!: ReservationStatus;

  @Column({ nullable: true })
  note?: string;

  @ManyToOne(
    () => BorrowRecord,
    (b: BorrowRecord) => b.reservations,
    { nullable: true, onDelete: 'SET NULL' }
  )
  @JoinColumn({ name: 'borrow_record_id' })
  borrowRecord?: BorrowRecord | null;
}