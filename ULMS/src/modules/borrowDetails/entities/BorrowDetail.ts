import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BorrowRecord } from '../../borrowRecords/entities/BorrowRecord';
import { Copy } from '../../copies/entities/Copy';
import { BorrowDetailStatus } from '../enums/borrowDetail-status.enum';

@Entity('borrow_details')
export class BorrowDetail {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => BorrowRecord, (br) => br.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'borrow_id' })
  borrowRecord!: BorrowRecord;

  @ManyToOne(() => Copy, (c) => c.borrowDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'copy_id' })
  copy!: Copy;

  @Column({ default: 1 })
  quantity!: number;

  @Column({ nullable: true })
  note?: string;

  @Column({
    type: 'enum',
    enum: BorrowDetailStatus,
    default: BorrowDetailStatus.BORROWED,
  })
  status!: BorrowDetailStatus;
}
