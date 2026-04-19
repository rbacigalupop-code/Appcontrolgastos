import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { BudgetSchema } from '@gastos/shared';
import { getDb } from '../../config/db';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
    WHERE (b.user_id = ? OR b.family_id = ?)
    AND b.start_date <= ? AND (b.end_date IS NULL OR b.end_date >= ?)
    ORDER BY b.created_at DESC
  `).all(uid, fid ?? -1, today, today) as any[];

  const result = budgets.map(b => {
    const spentWhere = fid ? `(user_id = ${uid} OR family_id = ${fid})` : `user_id = ${uid}`;
    const { spent } = db.prepare(`
      SELECT COALESCE(SUM(amount_clp), 0) as spent FROM transactions
      WHERE ${spentWhere} AND category_id = ? AND type = 'expense' AND date >= ?
    `).get(b.category_id, monthStart) as { spent: number };
    return { ...b, spent, pct_used: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0 };
  });

  res.json(result);
});

router.post('/', requireAuth, validate(BudgetSchema), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { category_id, period, amount, currency, start_date, end_date, alert_at_pct } = req.body;
  const r = db.prepare(`
    INSERT INTO budgets (user_id, family_id, category_id, period, amount, currency, start_date, end_date, alert_at_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user!.id, req.user!.family_id, category_id, period, amount, currency, start_date, end_date ?? null, alert_at_pct);
  res.status(201).json(db.prepare('SELECT * FROM budgets WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const b = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
  if (!b) { res.status(404).json({ error: 'No encontrado' }); return; }
  const { amount, alert_at_pct, end_date } = req.body;
  db.prepare('UPDATE budgets SET amount = COALESCE(?, amount), alert_at_pct = COALESCE(?, alert_at_pct), end_date = COALESCE(?, end_date) WHERE id = ?')
    .run(amount ?? null, alert_at_pct ?? null, end_date ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (r.changes === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).send();
});

export default router;
