import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Book } from '../../books/entities/Book';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => Book, (b) => b.category)
  books!: Book[];
}
