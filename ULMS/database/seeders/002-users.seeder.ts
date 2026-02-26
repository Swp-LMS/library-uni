// user.seed.ts
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/User';
import { UserRole } from '../../src/modules/users/enums/user.enum';
import { MembershipPlan } from '../../src/modules/memberships/entities/MembershipPlan';
import * as bcrypt from 'bcryptjs';

export const seedUsers = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(User);
  const planRepo = dataSource.getRepository(MembershipPlan);

  const basicPlan = await planRepo.findOne({ where: { name: 'Basic' } });

  const users = [
    {
      name: 'Admin',
      email: 'admin@ulms.com',
      password: await bcrypt.hash('123456', 10),
      role: UserRole.ADMIN,
      plan: null,
    },
    {
      name: 'Librarian',
      email: 'librarian@ulms.com',
      password: await bcrypt.hash('123456', 10),
      role: UserRole.LIBRARIAN,
      plan: null,
    },
    {
      name: 'Student A',
      email: 'student1@ulms.com',
      password: await bcrypt.hash('123456', 10),
      role: UserRole.STUDENT,
      plan: basicPlan,
    },
  ];

  await repo.save(users);
  console.log('✅ Seeded Users');
};