// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '@/modules/payments/payment.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';

const router = Router();

/**
 * Tạo QR SePay thanh toán tiền phạt cho 1 BorrowRecord
 * POST /api/borrow-records/:id/pay-bank-transfer
 */
router.post('/borrow-records/:id/pay-bank-transfer', PaymentController.createFineBankTransfer);

/**
 * 🔥 Membership – thanh toán gói bằng SePay
 * POST /api/payments/membership/:planId/bank-transfer
 */
router.post(
  '/payments/membership/:planId/bank-transfer',
  jwtAuthMiddleware,
  PaymentController.createMembershipBankTransfer,
);

/**
 * Webhook SePay bắn về khi có tiền vào
 * POST /api/webhooks/sepay-payment
 *
 * URL đầy đủ sẽ là:
 *   https://<ngrok hoặc domain của bạn>/api/webhooks/sepay-payment
 * khớp với SEPAY_CALLBACK_URL trong .env
 */
router.post('/webhooks/sepay-payment', PaymentController.handleSepayWebhook);

router.post('/sepay/webhook', PaymentController.handleSepayWebhook);

export default router;
