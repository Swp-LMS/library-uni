import { Request, Response } from 'express';
import { BorrowStatus } from '../borrowRecords/enums/borrow-status.enum';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { AppDataSource } from '../../../ormconfig';
import { BorrowRecord } from '../borrowRecords/entities/BorrowRecord';
import { Reservation } from '../reservations/entities/Reservation';

export class LibrarianController {
  /**
   * [GET] /api/librarian/stats
   * Returns statistics for librarian dashboard
   */
  static getStats = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(BorrowRecord);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Active Loans: count of borrow records that are not returned
      const activeLoans = await repo
        .createQueryBuilder('br')
        .where('br.status != :returnedStatus', { returnedStatus: BorrowStatus.RETURNED })
        .getCount();

      // Overdue: count of borrow records where due_date < today and status != returned
      const overdue = await repo
        .createQueryBuilder('br')
        .where('br.due_date < :today', { today })
        .andWhere('br.status != :returnedStatus', { returnedStatus: BorrowStatus.RETURNED })
        .getCount();

      // Reservations/Holds: count of pending or approved reservations
      const reservationRepo = AppDataSource.getRepository(Reservation);
      const holds = await reservationRepo
        .createQueryBuilder('r')
        .where('r.status = :pending', { pending: ReservationStatus.PENDING })
        .orWhere('r.status = :approved', { approved: ReservationStatus.APPROVED })
        .getCount();

      // Total Fines: sum of fine_amount from active borrow records (not returned)
      const totalFinesResult = await repo
        .createQueryBuilder('br')
        .select('SUM(br.fine_amount)', 'total')
        .where('br.status != :returnedStatus', { returnedStatus: BorrowStatus.RETURNED })
        .getRawOne();

      const totalFines = totalFinesResult?.total ? Number(totalFinesResult.total) : 0;

      return res.json({
        activeLoans,
        overdue,
        holds,
        totalFines,
      });
    } catch (error: any) {
      console.error('LibrarianController.getStats error:', error);
      return res.status(500).json({
        message: error.message || 'Failed to load stats',
        error: String(error),
      });
    }
  };
}
