import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/User';
import { Fine } from '../../fines/entities/Fine';
import { BorrowRecord } from '../../borrowRecords/entities/BorrowRecord';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentType } from '../enums/payment-type.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (u) => u.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // 🔹 Với FINE: có thể link tới Fine
  @OneToOne(() => Fine, (f) => f.payment, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'fine_id' })
  fine?: Fine | null;

  // 🔹 Với DEPOSIT: link tới BorrowRecord (thu/hoàn cọc cho phiếu mượn)
  @ManyToOne(() => BorrowRecord, (b) => b.payments, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'borrow_record_id' })
  borrowRecord?: BorrowRecord | null;

  // Số tiền của giao dịch (thu cọc / hoàn cọc / trả phạt)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  // Loại transaction: phạt / cọc / khác
  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.FINE,
    name: 'payment_type',
  })
  paymentType!: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
    name: 'payment_method',
  })
  paymentMethod!: PaymentMethod;

  @Column({
    name: 'payment_date',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  paymentDate!: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status!: PaymentStatus;

  @Column({ nullable: true })
  note?: string;
}
