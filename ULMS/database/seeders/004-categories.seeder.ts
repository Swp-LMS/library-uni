import { DataSource } from 'typeorm';
import { Category } from '../../src/modules/categories/entities/Category';

export const seedCategories = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Category);

  await repo.save([
    { name: 'Fantasy' },
    { name: 'Science Fiction' },
    { name: 'Classic' },
  ]);

  console.log('✅ Seeded Categories');
};