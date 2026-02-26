// utils/loan-rules.ts

import { MembershipPlan } from '@/modules/memberships/entities/MembershipPlan';

export type LoanRule = {
  maxLoanDays: number;
  depositAmount: number;
  requiresDeposit: boolean;
  tier: 'low' | 'medium' | 'high';
};

// Kiểu "Settings giống giống" để không phụ thuộc trực tiếp entity
export type LoanSettingsLike = {
  lowPriceMax: number;
  midPriceMax: number;
  lowLoanDays: number;
  midLoanDays: number;
  highLoanDays: number;
  lowDeposit: number;
  midDeposit: number;
  highDeposit: number;
};

/**
 * Tính rule mượn sách dựa theo giá + SETTINGS
 */
export function calcLoanRuleByPrice(
  price: number | null | undefined,
  settings?: LoanSettingsLike,
): LoanRule {
  const p = Number(price ?? 0);

  // ✅ fallback nếu chưa có settings (dùng số cứng)
  const s: LoanSettingsLike = settings
    ? settings
    : {
        lowPriceMax: 200_000,
        midPriceMax: 500_000,
        lowLoanDays: 7,
        midLoanDays: 14,
        highLoanDays: 30,
        lowDeposit: 0,
        midDeposit: 50_000,
        highDeposit: 200_000,
      };

  const lowDays = s.lowLoanDays || 7;
  const midDays = s.midLoanDays || 14;
  const highDays = s.highLoanDays || 30;

  const lowDep = s.lowDeposit ?? 0;
  const midDep = s.midDeposit ?? 50_000;
  const highDep = s.highDeposit ?? 200_000;

  // Nếu giá không hợp lệ → coi như sách rẻ
  if (!Number.isFinite(p) || p <= 0) {
    return {
      maxLoanDays: lowDays,
      depositAmount: lowDep,
      requiresDeposit: lowDep > 0,
      tier: 'low',
    };
  }

  // Tier 1
  if (p <= s.lowPriceMax) {
    return {
      maxLoanDays: lowDays,
      depositAmount: lowDep,
      requiresDeposit: lowDep > 0,
      tier: 'low',
    };
  }

  // Tier 2
  if (p <= s.midPriceMax) {
    return {
      maxLoanDays: midDays,
      depositAmount: midDep,
      requiresDeposit: midDep > 0,
      tier: 'medium',
    };
  }

  // Tier 3
  return {
    maxLoanDays: highDays,
    depositAmount: highDep,
    requiresDeposit: highDep > 0,
    tier: 'high',
  };
}

/**
 * Áp dụng ưu đãi tiền cọc theo MembershipPlan
 *
 * - BASIC: không cần cọc nếu giá < 200k
 * - PREMIUM (plan.id === 2): giảm 50% cọc; nếu giá > 500k thì cọc tối đa 100k
 * - VIP (name === 'vip' hoặc id === 3): không cần cọc nếu giá < 500k
 */
export function applyPlanDepositRule(
  rule: LoanRule,
  price: number,
  plan?: MembershipPlan | null,
): LoanRule {
  if (!plan) return rule;

  const updated: LoanRule = { ...rule };
  const name = (plan.name || '').trim().toLowerCase();
  const p = Number(price ?? 0);

  // BASIC: không cần cọc < 200k
  if (name === 'basic') {
    if (p > 0 && p < 200_000) {
      updated.depositAmount = 0;
      updated.requiresDeposit = false;
    }
  }

  // STANDARD: giảm 50% cọc, sách >500k max 100k
  if (name === 'standard') {
    updated.depositAmount = Math.floor(updated.depositAmount / 2);

    if (p > 500_000 && updated.depositAmount > 100_000) {
      updated.depositAmount = 100_000;
    }

    updated.requiresDeposit = updated.depositAmount > 0;
  }

  // PREMIUM: không cần cọc < 500k
  if (name === 'premium') {
    if (p > 0 && p < 500_000) {
      updated.depositAmount = 0;
      updated.requiresDeposit = false;
    }
  }

  return updated;
}
