import { AppDataSource } from '../../ormconfig';

import { seedMembershipPlans } from './001-memberships.seeder';
import { seedUsers } from './002-users.seeder';
import { seedAuthors } from './003-authors.seeder';
import { seedCategories } from './004-categories.seeder';
import { seedPublishers } from './005-publishers.seeder';
import { seedBooks } from './006-books.seeder';
import { seedCopies } from './007-copies.seeder';

const runSeeds = async () => {
  try {
    await AppDataSource.initialize();
    console.log('🌱 Seeding started...');

    // ⚠️ Thứ tự rất quan trọng (FK)
    await seedMembershipPlans(AppDataSource);
    await seedUsers(AppDataSource);
    await seedAuthors(AppDataSource);
    await seedCategories(AppDataSource);
    await seedPublishers(AppDataSource);
    await seedBooks(AppDataSource);
    await seedCopies(AppDataSource);

    console.log('✅ All seeds completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

runSeeds();