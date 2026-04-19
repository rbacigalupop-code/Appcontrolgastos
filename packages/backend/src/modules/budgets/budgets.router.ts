import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { BudgetSchema } from '@gastos/shared';
import { getDb } from '../../config/db';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const budgets = await sql`
    SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
    WHERE (b.user_id = ${uid} OR b.family_id = ${fid})
      AND b.start_date <= ${today}
      AND (b.end_date IS NULL OR b.end_date >= ${today})
    ORDER BY b.created_at DESC
  `;

  const result = await Promise.all(budgets.map(async b => {
    const [{ spent }] = await sql`
      SELECT COALESCE(SUM(amount_clp), 0) as spent FROM transactions
      WHERE (user_id = ${uid} OR family_id = ${fid})
        AND category_id = ${b.category_id}
        AND type = 'expense' AND date >= ${monthStart}
    `;
    const s = Number(spent);
    const a = Number(b.amount);
    return { ...b, spent: s, pct_used: a > 0 ? Math.round((s / a) * 100) : 0 };
  }));

  res.json(result);
});

router.post('/', requireAuth, validate(BudgetSchema), async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { category_id, period, amount, currency, start_date, end_date, alert_at_pct } = req.body;
  const [b] = await sql`
    INSERT INTO budgets (user_id, family_id, category_id, period, amount, currency, start_date, end_date, alert_at_pct)
    VALUES (${req.user!.id}, ${req.user!.family_id}, ${category_id}, ${period}, ${amount}, ${currency},
            ${start_date}, ${end_date ?? null}, ${alert_at_pct})
    RETURNING *
  `;
  res.status(201).json(b);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [b] = await sql`SELECT * FROM budgets WHERE id = ${req.params.id} AND user_id = ${req.user!.id}`;
  if (!b) { res.status(404).json({ error: 'No encontrado' }); return; }
  const [updated] = await sql`
    UPDATE budgets SET
      amount = COALESCE(${req.body.amount ?? null}, amount),
      alert_at_pct = COALESCE(${req.body.alert_at_pct ?? null}, alert_at_pct),
      end_date = COALESCE(${req.body.end_date ?? null}, end_date)
    WHERE id = ${req.params.id} RETURNING *
  `;
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const result = await sql`DELETE FROM budgets WHERE id = ${req.params.id} AND user_id = ${req.user!.id} RETURNING id`;
  if (!result.length) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).send();
});

export default router;
