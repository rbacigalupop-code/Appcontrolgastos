import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';
import { computeFinancialHealth } from '../../utils/financialScore';

const router = Router();

router.get('/health-score', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const since = sixMonthsAgo.toISOString().slice(0, 10);
  const where = fid ? `(user_id = ${uid} OR family_id = ${fid})` : `user_id = ${uid}`;

  const { total_income, total_expense } = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount_clp ELSE 0 END),0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_clp ELSE 0 END),0) as total_expense
    FROM transactions WHERE ${where} AND date >= ?
  `).get(since) as any;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const budgets = db.prepare(`SELECT * FROM budgets WHERE (user_id = ? OR family_id = ?) AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`).all(uid, fid ?? -1, today, today) as any[];
  let adherentBudgets = 0;
  for (const b of budgets) {
    const { spent } = db.prepare(`SELECT COALESCE(SUM(amount_clp),0) as spent FROM transactions WHERE ${where} AND category_id = ? AND type = 'expense' AND date >= ?`).get(b.category_id, monthStart) as any;
    if (spent <= b.amount) adherentBudgets++;
  }
  const budgetAdherencePct = budgets.length > 0 ? (adherentBudgets / budgets.length) * 100 : 50;

  const { num_types } = db.prepare(`SELECT COUNT(DISTINCT asset_type) as num_types FROM investment_assets ia JOIN investment_portfolios ip ON ip.id = ia.portfolio_id WHERE ip.user_id = ?`).get(uid) as any;

  const { months_with_income } = db.prepare(`SELECT COUNT(DISTINCT strftime('%Y-%m', date)) as months_with_income FROM transactions WHERE ${where} AND type='income' AND date >= ?`).get(since) as any;

  const health = computeFinancialHealth({
    totalIncome: total_income,
    totalExpense: total_expense,
    budgetAdherencePct,
    numAssetTypes: num_types ?? 0,
    numMonthsWithIncome: months_with_income ?? 0,
  });

  res.json(health);
});

router.get('/daily', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const { date_from, date_to } = req.query as Record<string, string>;
  const where = fid ? `(user_id = ${uid} OR family_id = ${fid})` : `user_id = ${uid}`;
  const dateFilter = [
    date_from ? `date >= '${date_from}'` : '',
    date_to ? `date <= '${date_to}'` : '',
  ].filter(Boolean).join(' AND ');
  const fullWhere = dateFilter ? `${where} AND ${dateFilter}` : where;

  const rows = db.prepare(`
    SELECT date,
      COALESCE(SUM(CASE WHEN type='income' THEN amount_clp ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_clp ELSE 0 END),0) as expense
    FROM transactions WHERE ${fullWhere}
    GROUP BY date ORDER BY date ASC
  `).all() as any[];

  res.json(rows.map(r => ({ ...r, net: r.income - r.expense })));
});

router.get('/weekly-projection', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const weeks = parseInt(req.query.weeks as string ?? '4');
  const where = fid ? `(user_id = ${uid} OR family_id = ${fid})` : `user_id = ${uid}`;

  const avgByCategory = db.prepare(`
    SELECT category_id, c.name as category_name, c.color,
      AVG(weekly_total) as avg_weekly
    FROM (
      SELECT category_id, strftime('%Y-%W', date) as week, SUM(amount_clp) as weekly_total
      FROM transactions WHERE ${where} AND type = 'expense' AND date >= date('now', '-12 weeks')
      GROUP BY category_id, week
    ) sub
    JOIN categories c ON c.id = sub.category_id
    GROUP BY category_id
  `).all() as any[];

  const projections = avgByCategory.map(cat => ({
    category_id: cat.category_id,
    category_name: cat.category_name,
    color: cat.color ?? '#6366f1',
    projected_weekly: Math.round(cat.avg_weekly),
    projected_total: Math.round(cat.avg_weekly * weeks),
  }));

  res.json({ weeks, projections });
});

router.get('/category-breakdown', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const { date_from, date_to, type = 'expense' } = req.query as Record<string, string>;
  const where = fid ? `(t.user_id = ${uid} OR t.family_id = ${fid})` : `t.user_id = ${uid}`;
  const dateFilter = [
    date_from ? `t.date >= '${date_from}'` : '',
    date_to ? `t.date <= '${date_to}'` : '',
  ].filter(Boolean).join(' AND ');
  const fullWhere = dateFilter ? `${where} AND t.type = '${type}' AND ${dateFilter}` : `${where} AND t.type = '${type}'`;

  const rows = db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, SUM(t.amount_clp) as total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${fullWhere}
    GROUP BY t.category_id ORDER BY total DESC
  `).all();

  res.json(rows);
});

router.get('/income-expense-trend', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const months = parseInt(req.query.months as string ?? '12');
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().slice(0, 7) + '-01';
  const where = fid ? `(user_id = ${uid} OR family_id = ${fid})` : `user_id = ${uid}`;

  const rows = db.prepare(`
    SELECT strftime('%Y-%m', date) as month,
      COALESCE(SUM(CASE WHEN type='income' THEN amount_clp ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_clp ELSE 0 END),0) as expense
    FROM transactions WHERE ${where} AND date >= ?
    GROUP BY month ORDER BY month ASC
  `).all(sinceStr) as any[];

  res.json(rows.map(r => ({ ...r, net: r.income - r.expense })));
});

export default router;
