import { DataSource } from 'typeorm';
import { Publisher } from '../../src/modules/publishers/entities/Publisher';

export const seedPublishers = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Publisher);

  await repo.save([
    { name: 'Bloomsbury' },
    { name: 'Penguin Books' },
  ]);

  console.log('✅ Seeded Publishers');
};