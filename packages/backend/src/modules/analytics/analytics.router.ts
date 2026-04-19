import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';
import { computeFinancialHealth } from '../../utils/financialScore';

const router = Router();

router.get('/health-score', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const [totals] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount_clp ELSE 0 END),0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_clp ELSE 0 END),0) as total_expense
    FROM transactions
    WHERE (user_id = ${uid} OR family_id = ${fid})
      AND date >= NOW() - INTERVAL '6 months'
  `;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const budgets = await sql`
    SELECT * FROM budgets WHERE (user_id = ${uid} OR family_id = ${fid})
      AND start_date <= ${today} AND (end_date IS NULL OR end_date >= ${today})
  `;

  let adherent = 0;
  for (const b of budgets) {
    const [{ spent }] = await sql`
      SELECT COALESCE(SUM(amount_clp),0) as spent FROM transactions
      WHERE (user_id = ${uid} OR family_id = ${fid})
        AND category_id = ${b.category_id} AND type = 'expense' AND date >= ${monthStart}
    `;
    if (Number(spent) <= Number(b.amount)) adherent++;
  }
  const budgetAdherencePct = budgets.length > 0 ? (adherent / budgets.length) * 100 : 50;

  const [{ num_types }] = await sql`
    SELECT COUNT(DISTINCT ia.asset_type) as num_types
    FROM investment_assets ia
    JOIN investment_portfolios ip ON ip.id = ia.portfolio_id
    WHERE ip.user_id = ${uid}
  `;

  const [{ months_with_income }] = await sql`
    SELECT COUNT(DISTINCT TO_CHAR(date, 'YYYY-MM')) as months_with_income
    FROM transactions
    WHERE (user_id = ${uid} OR family_id = ${fid})
      AND type = 'income' AND date >= NOW() - INTERVAL '6 months'
  `;

  res.json(computeFinancialHealth({
    totalIncome: Number(totals.total_income),
    totalExpense: Number(totals.total_expense),
    budgetAdherencePct,
    numAssetTypes: Number(num_types ?? 0),
    numMonthsWithIncome: Number(months_with_income ?? 0),
  }));
});

router.get('/daily', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { date_from, date_to } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const rows = await sql`
    SELECT date::text,
      COALESCE(SUM(CASE WHEN type='income' THEN amount_clp ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_clp ELSE 0 END),0) as expense
    FROM transactions
    WHERE (user_id = ${uid} OR family_id = ${fid})
    ${date_from ? sql`AND date >= ${date_from}` : sql``}
    ${date_to ? sql`AND date <= ${date_to}` : sql``}
    GROUP BY date ORDER BY date ASC
  `;

  res.json(rows.map(r => ({ ...r, income: Number(r.income), expense: Number(r.expense), net: Number(r.income) - Number(r.expense) })));
});

router.get('/weekly-projection', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const weeks = parseInt(req.query.weeks as string ?? '4');

  const rows = await sql`
    SELECT sub.category_id, c.name as category_name, c.color, AVG(sub.weekly_total) as avg_weekly
    FROM (
      SELECT category_id, TO_CHAR(date, 'IYYY-IW') as week, SUM(amount_clp) as weekly_total
      FROM transactions
      WHERE (user_id = ${uid} OR family_id = ${fid})
        AND type = 'expense' AND date >= NOW() - INTERVAL '12 weeks'
      GROUP BY category_id, week
    ) sub
    JOIN categories c ON c.id = sub.category_id
    GROUP BY sub.category_id, c.name, c.color
    ORDER BY avg_weekly DESC
  `;

  res.json({
    weeks,
    projections: rows.map(r => ({
      category_id: r.category_id,
      category_name: r.category_name,
      color: r.color ?? '#6366f1',
      projected_weekly: Math.round(Number(r.avg_weekly)),
      projected_total: Math.round(Number(r.avg_weekly) * weeks),
    })),
  });
});

router.get('/category-breakdown', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { date_from, date_to, type = 'expense' } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const rows = await sql`
    SELECT c.id, c.name, c.icon, c.color, SUM(t.amount_clp) as total
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE (t.user_id = ${uid} OR t.family_id = ${fid})
      AND t.type = ${type}
    ${date_from ? sql`AND t.date >= ${date_from}` : sql``}
    ${date_to ? sql`AND t.date <= ${date_to}` : sql``}
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY total DESC
  `;

  res.json(rows.map(r => ({ ...r, total: Number(r.total) })));
});

router.get('/income-expense-trend', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const months = parseInt(req.query.months as string ?? '12');

  const rows = await sql`
    SELECT TO_CHAR(date, 'YYYY-MM') as month,
      COALESCE(SUM(CASE WHEN type='income' THEN amount_clp ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount_clp ELSE 0 END),0) as expense
    FROM transactions
    WHERE (user_id = ${uid} OR family_id = ${fid})
      AND date >= NOW() - ${`${months} months`}::interval
    GROUP BY month ORDER BY month ASC
  `;

  res.json(rows.map(r => ({ ...r, income: Number(r.income), expense: Number(r.expense), net: Number(r.income) - Number(r.expense) })));
});

export default router;
