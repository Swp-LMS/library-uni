import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { BorrowRecord } from '../../borrowRecords/entities/BorrowRecord';
import { User } from '../../users/entities/User';

@Entity('return_records')
export class ReturnRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => BorrowRecord, (b) => b.returnRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'borrow_record_id' })
  borrowRecord!: BorrowRecord;

  @ManyToOne(() => User, (u) => u.handledReturns, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy!: User;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;
}
