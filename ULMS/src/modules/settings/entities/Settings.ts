import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryColumn({ default: 'main' })
  id: string = 'main';

  // ====== CẤU HÌNH CHUNG ======

  // Tối đa số sách một user được mượn cùng lúc
  @Column({ type: 'int', default: 5 })
  maxBooksPerUser!: number;

  // Tiền phạt mỗi ngày (VND)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1000 })
  finePerDay!: number;

  // Số ngày giữ reservation trước khi auto cancel
  @Column({ type: 'int', default: 3 })
  holdExpireDays!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ====== RULE THEO GIÁ SÁCH ======
  // Ngưỡng giá:
  //  - 0  -> lowPriceMax       (tier low)
  //  - lowPriceMax+1 -> midPriceMax (tier medium)
  //  - > midPriceMax            (tier high)

  @Column({ type: 'int', default: 200000 })
  lowPriceMax!: number; // < 200k

  @Column({ type: 'int', default: 500000 })
  midPriceMax!: number; // 200k–500k

  // Số ngày mượn tối đa cho từng tier
  @Column({ type: 'int', default: 7 })
  lowLoanDays!: number; // sách rẻ

  @Column({ type: 'int', default: 14 })
  midLoanDays!: number; // sách trung bình

  @Column({ type: 'int', default: 30 })
  highLoanDays!: number; // sách đắt

  // Tiền cọc cho từng tier
  @Column({ type: 'int', default: 0 })
  lowDeposit!: number; // thường = 0

  @Column({ type: 'int', default: 50000 })
  midDeposit!: number; // mặc định 50k

  @Column({ type: 'int', default: 200000 })
  highDeposit!: number; // mặc định 200k

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
