import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Book } from '../../books/entities/Book';

@Entity('authors')
export class Author {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  biography?: string;

  @Column({ name: 'birth_year', type: 'int', nullable: true })
  birthYear?: number;

  @OneToMany(() => Book, (b) => b.author)
  books!: Book[];
}
