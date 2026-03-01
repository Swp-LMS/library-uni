// jobs/membership.cron.ts
import cron from 'node-cron';
import { AppDataSource } from '../../ormconfig';
import { MembershipService } from '@/modules/memberships/membership.service';
import { NotificationService } from '@/modules/notifications/notification.service';
import { NotiType } from '@/modules/notifications/enums/notification-type.enum';

export async function startMembershipCron() {
  // đảm bảo DB đã connect
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const membershipService = new MembershipService();
  const notificationService = new NotificationService();

  console.log('⏰ Membership cron initialized');

  // Mỗi 5 tiếng (phút 0 của các giờ: 0h, 5h, 10h, 15h, 20h)
  cron.schedule('0 */5 * * *', async () => {
    try {
      console.log('[CRON] membership reminder running...');

      const users = await membershipService.getUsersBasicNeedReminder();
      if (!users.length) {
        console.log('[CRON] No users need membership reminder.');
        return;
      }

      for (const user of users) {
        await notificationService.create({
          userId: user.id,
          type: NotiType.SYSTEM,
          title: 'Gói Basic sắp hết hạn',
          message:
            'Gói Basic của bạn sắp hết hạn. Nâng cấp ngay để tiếp tục mượn sách và nhận ưu đãi giảm giá!',
        });
      }

      console.log(`[CRON] Membership reminders sent to ${users.length} users.`);
    } catch (err) {
      console.error('[CRON] membership reminder error:', err);
    }
  });

  console.log('✅ Membership cron job started');
}
