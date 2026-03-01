import cron from 'node-cron';
import { ReservationService } from '@/modules/reservations/reservation.service';
import { AppDataSource } from '../../ormconfig';

export async function startReservationCron() {
  // đảm bảo DB đã connect
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const reservationService = new ReservationService();

  // 🕓 Chạy mỗi 5 phút (hoặc đổi sang * * * * * để test mỗi phút)
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('⏰ [Cron] Checking expired reservations...');
      await reservationService.expireOverdueReservations();
    } catch (error) {
      console.error('❌ [Cron] Error in reservation cron:', error);
    }
  });

  console.log('✅ Reservation cron job started (every 5 minutes)');
}
