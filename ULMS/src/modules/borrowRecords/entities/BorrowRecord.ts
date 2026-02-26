import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/User';
import { BorrowDetail } from '../../borrowDetails/entities/BorrowDetail';
import { Fine } from '../../fines/entities/Fine';
import { ReturnRecord } from '../../returnRecords/entities/ReturnRecord';
import { BorrowStatus } from '../enums/borrow-status.enum';
import { Reservation } from '../../reservations/entities/Reservation';
import { DepositStatus } from '../enums/deposit-status.enum';
import { Payment } from '../../payments/entities/Payment';

@Entity('borrow_records')
export class BorrowRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy?: User | null;

  @Column({ type: 'datetime', name: 'borrow_date', nullable: true })
  borrowDate?: Date | null;

  @Column({ type: 'datetime', name: 'due_date', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'date', nullable: true, name: 'return_date' })
  returnDate?: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  requiredDeposit!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidDeposit!: number;

  @Column({
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.NONE,
    name: 'deposit_status',
  })
  depositStatus!: DepositStatus;

  @Column({
    type: 'enum',
    enum: BorrowStatus,
    default: BorrowStatus.PENDING,
  })
  status!: BorrowStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'fine_amount',
  })
  fineAmount!: number;

  @OneToMany(() => BorrowDetail, (detail: BorrowDetail) => detail.borrowRecord)
  details?: BorrowDetail[];

  @OneToMany(() => Fine, (fine: Fine) => fine.borrowRecord)
  fines?: Fine[];

  @OneToMany(() => ReturnRecord, (r: ReturnRecord) => r.borrowRecord)
  returnRecords?: ReturnRecord[];

  @OneToMany(() => Reservation, (r: Reservation) => r.borrowRecord)
  reservations?: Reservation[];

  @OneToMany(() => Payment, (p: Payment) => p.borrowRecord)
  payments?: Payment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'datetime', name: 'updated_at', nullable: true })
  updatedAt?: Date | null;
}