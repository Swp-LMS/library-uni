import { DataSource } from 'typeorm';
import { Author } from '../../src/modules/authors/entities/Author';

export const seedAuthors = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Author);

  await repo.save([
    { name: 'J.K. Rowling' },
    { name: 'George Orwell' },
    { name: 'Harper Lee' },
  ]);

  console.log('✅ Seeded Authors');
};