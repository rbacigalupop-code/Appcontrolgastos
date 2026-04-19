export interface User {
  id: number;
  family_id: number | null;
  email: string;
  name: string;
  role: 'owner' | 'member';
  avatar_url: string | null;
  currency: string;
  created_at: string;
}

export interface Family {
  id: number;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface Category {
  id: number;
  family_id: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'income' | 'expense' | 'both';
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  family_id: number | null;
  category_id: number | null;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  amount_clp: number | null;
  description: string | null;
  date: string;
  is_recurring: boolean;
  recurrence: 'daily' | 'weekly' | 'monthly' | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface SavingsAccount {
  id: number;
  user_id: number;
  family_id: number | null;
  name: string;
  institution: string | null;
  color: string;
  emoji: string;
  balance: number;
  currency: string;
  goal: number | null;
  is_shared: boolean;
  created_at: string;
}

export interface SavingsMovement {
  id: number;
  savings_account_id: number;
  user_id: number;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface InvestmentPortfolio {
  id: number;
  user_id: number;
  family_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
  assets?: InvestmentAsset[];
}

export interface InvestmentAsset {
  id: number;
  portfolio_id: number;
  name: string;
  asset_type: 'stock' | 'etf' | 'crypto' | 'fixed_income' | 'real_estate' | 'other';
  ticker: string | null;
  amount_invested: number;
  current_value: number;
  currency: string;
  allocation_pct: number | null;
  target_pct: number | null;
  annual_return: number | null;
  updated_at: string;
}

export interface InvestmentAlert {
  id: number;
  user_id: number;
  asset_id: number | null;
  alert_type: 'rebalance' | 'return_below' | 'allocation_drift';
  threshold: number | null;
  message: string | null;
  is_read: boolean;
  triggered_at: string;
}

export interface Budget {
  id: number;
  user_id: number;
  family_id: number | null;
  category_id: number | null;
  period: 'monthly' | 'weekly';
  amount: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  alert_at_pct: number;
  created_at: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  spent?: number;
  pct_used?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'budget_alert' | 'savings_goal' | 'investment_alert';
  title: string;
  body: string | null;
  entity_id: number | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FinancialHealth {
  score: number;
  savings_rate: number;
  budget_adherence: number;
  investment_diversity: number;
  income_stability: number;
  label: 'Excelente' | 'Bueno' | 'Regular' | 'Crítico';
  tips: string[];
}

export interface DailySummary {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeeklyProjection {
  week_label: string;
  categories: Array<{
    category_id: number;
    category_name: string;
    color: string;
    projected: number;
    actual: number;
  }>;
}

export interface AuthResponse {
  user: User;
  token: string;
}
