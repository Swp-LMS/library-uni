import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/User';

@Entity('membership_plans')
export class MembershipPlan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', unsigned: true })
  price!: number;

  @Column({ name: 'max_books', type: 'int', unsigned: true })
  maxBooks!: number;

  @Column({ name: 'duration_days', type: 'int', unsigned: true })
  durationDays!: number;

  // ✅ BOOLEAN chuẩn
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => User, (u) => u.plan)
  users!: User[];
}