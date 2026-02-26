import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/Reservation';
import { BorrowRecord } from '../../borrowRecords/entities/BorrowRecord';
import { Payment } from '../../payments/entities/Payment';
import { Notification } from '../../notifications/entities/Notification';
import { Review } from '../../reviews/entities/Review';
import { ReturnRecord } from '../../returnRecords/entities/ReturnRecord';
import { UserRole } from '../enums/user.enum';
import { MembershipPlan } from '../../memberships/entities/MembershipPlan';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ unique: true, length: 100 })
  email!: string;

  @Column({ length: 255 })
  password!: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role!: UserRole;

  @Column({ name: 'plan_id', type: 'int', nullable: true })
  planId?: number | null;

  @ManyToOne(() => MembershipPlan, (plan) => plan.users, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan?: MembershipPlan | null;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => BorrowRecord, (br) => br.user)
  borrowRecords!: BorrowRecord[];

  @OneToMany(() => BorrowRecord, (br) => br.processedBy)
  processedRecords!: BorrowRecord[];

  @OneToMany(() => Payment, (p) => p.user)
  payments!: Payment[];

  @OneToMany(() => Reservation, (r) => r.user)
  reservations!: Reservation[];

  @OneToMany(() => Review, (r) => r.user)
  reviews!: Review[];

  @Column({ name: 'plan_expires_at', type: 'datetime', nullable: true })
  planExpiresAt?: Date | null;

  // ✅ BOOLEAN chuẩn cho MySQL
  @Column({ name: 'has_used_basic_trial', type: 'boolean', default: false })
  hasUsedBasicTrial!: boolean;

  @Column({ name: 'has_used_upgrade_promo', type: 'boolean', default: false })
  hasUsedUpgradePromo!: boolean;

  @OneToMany(() => Notification, (n) => n.user, { cascade: true })
  notifications!: Notification[];

  @OneToMany(() => ReturnRecord, (rr) => rr.processedBy)
  handledReturns!: ReturnRecord[];

  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true })
  googleId?: string | null;

  // ✅ BOOLEAN chuẩn
  @Column({ name: 'is_blacklisted', type: 'boolean', default: false })
  isBlacklisted!: boolean;
}