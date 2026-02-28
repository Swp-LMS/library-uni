import cron from 'node-cron';
import { BorrowRecordService } from '@/modules/borrowRecords/borrowRecord.service';
import { AppDataSource } from '../../ormconfig';

export async function startBorrowCron() {
  // đảm bảo DB đã connect
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const borrowService = new BorrowRecordService();

  console.log('⏰ Borrow cron initialized');

  // 08:00 – nhắc trước hạn 1 ngày
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[CRON] sendDueTomorrowReminders running...');
      const count = await borrowService.sendDueTomorrowReminders();
      console.log(`[CRON] Reminders sent: ${count}`);
    } catch (err) {
      console.error('[CRON] sendDueTomorrowReminders error:', err);
    }
  });

  // 00:05 – xử lý quá hạn & tạo/cập nhật tiền phạt
  cron.schedule('5 0 * * *', async () => {
    //chạy mỗi ngày lúc 00:05 (nếu cần test thì tạm đổi thành '*/1 * * * *')
    try {
      console.log('[CRON] processOverdueFinesDaily running...');
      const count = await borrowService.processOverdueFinesDaily();
      console.log(`[CRON] Overdue fines processed: ${count}`);
    } catch (err) {
      console.error('[CRON] processOverdueFinesDaily error:', err);
    }
  });

  console.log('✅ Borrow cron job started');
}
