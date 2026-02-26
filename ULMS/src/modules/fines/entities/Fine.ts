// src/modules/fines/entities/Fine.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BorrowRecord } from '../../borrowRecords/entities/BorrowRecord';
import { Payment } from '../../payments/entities/Payment';
import { FineStatus } from '../enums/fine-status.enum';

@Entity('fines')
export class Fine {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => BorrowRecord, (br) => br.fines, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'borrow_id' })
  borrowRecord!: BorrowRecord | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: FineStatus,
    default: FineStatus.UNPAID,
  })
  status!: FineStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => Payment, (p) => p.fine)
  payment!: Payment;
}
