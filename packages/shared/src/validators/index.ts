import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const TransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.string().default('CLP'),
  category_id: z.number().optional(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_recurring: z.boolean().default(false),
  recurrence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  tags: z.array(z.string()).default([]),
});

export const SavingsAccountSchema = z.object({
  name: z.string().min(1),
  institution: z.string().optional(),
  color: z.string().default('#6366F1'),
  emoji: z.string().default('💳'),
  balance: z.number().default(0),
  currency: z.string().default('CLP'),
  goal: z.number().optional(),
  is_shared: z.boolean().default(false),
});

export const SavingsMovementSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const BudgetSchema = z.object({
  category_id: z.number(),
  period: z.enum(['monthly', 'weekly']),
  amount: z.number().positive(),
  currency: z.string().default('CLP'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().optional(),
  alert_at_pct: z.number().min(1).max(100).default(80),
});

export const InvestmentAssetSchema = z.object({
  name: z.string().min(1),
  asset_type: z.enum(['stock', 'etf', 'crypto', 'fixed_income', 'real_estate', 'other']),
  ticker: z.string().optional(),
  amount_invested: z.number().nonnegative(),
  current_value: z.number().nonnegative(),
  currency: z.string().default('CLP'),
  target_pct: z.number().min(0).max(100).optional(),
  annual_return: z.number().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['income', 'expense', 'both']),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type SavingsAccountInput = z.infer<typeof SavingsAccountSchema>;
export type SavingsMovementInput = z.infer<typeof SavingsMovementSchema>;
export type BudgetInput = z.infer<typeof BudgetSchema>;
export type InvestmentAssetInput = z.infer<typeof InvestmentAssetSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
