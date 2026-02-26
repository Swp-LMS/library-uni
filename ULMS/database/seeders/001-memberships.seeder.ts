import { DataSource } from 'typeorm';
import { MembershipPlan } from '../../src/modules/memberships/entities/MembershipPlan';

export const seedMembershipPlans = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(MembershipPlan);

  const plans = [
    {
      name: 'Basic',
      description: 'Borrow up to 3 books',
      price: 0,
      maxBooks: 3,
      durationDays: 30,
      isActive: true,
    },
    {
      name: 'Standard',
      description: 'Borrow up to 5 books',
      price: 50000,
      maxBooks: 5,
      durationDays: 30,
      isActive: true,
    },
    {
      name: 'Premium',
      description: 'Borrow up to 10 books',
      price: 100000,
      maxBooks: 10,
      durationDays: 30,
      isActive: true,
    },
  ];

  await repo.save(plans);
  console.log('✅ Seeded Membership Plans');
};