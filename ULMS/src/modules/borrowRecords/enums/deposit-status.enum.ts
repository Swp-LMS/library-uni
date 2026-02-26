// src/modules/borrowRecords/enums/deposit-status.enum.ts
export enum DepositStatus {
  NONE = 'none', // không cần cọc
  PENDING = 'pending', // cần cọc nhưng chưa thu
  HELD = 'held', // đã thu, đang giữ
  REFUNDED = 'refunded', // đã hoàn cọc
  USED = 'used',
}
