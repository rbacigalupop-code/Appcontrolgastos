import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { TransactionSchema } from '@gastos/shared';
import { getDb } from '../../config/db';
import { checkBudgetAlerts } from '../budgets/budgets.service';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { type, category_id, date_from, date_to, search, page = '1', limit = '50', scope } = req.query as Record<string, string>;

  let where = scope === 'family' && req.user!.family_id
    ? `(t.family_id = ${req.user!.family_id})`
    : `(t.user_id = ${req.user!.id})`;

  const conditions: string[] = [where];
  if (type) conditions.push(`t.type = '${type}'`);
  if (category_id) conditions.push(`t.category_id = ${parseInt(category_id)}`);
  if (date_from) conditions.push(`t.date >= '${date_from}'`);
  if (date_to) conditions.push(`t.date <= '${date_to}'`);
  if (search) conditions.push(`(t.description LIKE '%${search.replace(/'/g, "''")}%')`);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           u.name as user_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `;
  const countSql = `SELECT COUNT(*) as total FROM transactions t WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(sql).all().map((r: any) => ({ ...r, tags: JSON.parse(r.tags || '[]'), is_recurring: !!r.is_recurring }));
  const { total } = db.prepare(countSql).get() as { total: number };

  res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
});

router.get('/summary', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { date_from, date_to } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const baseWhere = fid ? `(family_id = ${fid} OR user_id = ${uid})` : `user_id = ${uid}`;
  const dateFilter = [
    date_from ? `date >= '${date_from}'` : '',
    date_to ? `date <= '${date_to}'` : '',
  ].filter(Boolean).join(' AND ');
  const where = dateFilter ? `${baseWhere} AND ${dateFilter}` : baseWhere;

  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount_clp ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount_clp ELSE 0 END) as total_expense,
      COUNT(*) as count
    FROM transactions WHERE ${where}
  `).get() as any;

  res.json({
    total_income: row.total_income ?? 0,
    total_expense: row.total_expense ?? 0,
    net: (row.total_income ?? 0) - (row.total_expense ?? 0),
    count: row.count ?? 0,
  });
});

router.post('/', requireAuth, validate(TransactionSchema), async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { type, amount, currency, category_id, description, date, is_recurring, recurrence, tags } = req.body;

  const rates = db.prepare("SELECT rate FROM exchange_rates WHERE from_curr = ? AND to_curr = 'CLP'").get(currency) as any;
  const rate = rates?.rate ?? 1;
  const amount_clp = currency === 'CLP' ? amount : amount * rate;

  const r = db.prepare(`
    INSERT INTO transactions (user_id, family_id, category_id, type, amount, currency, amount_clp, description, date, is_recurring, recurrence, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user!.id, req.user!.family_id, category_id ?? null, type, amount, currency, amount_clp,
    description ?? null, date, is_recurring ? 1 : 0, recurrence ?? null, JSON.stringify(tags)
  );

  const tx = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(r.lastInsertRowid) as any;

  if (type === 'expense' && category_id) {
    checkBudgetAlerts(req.user!.id, req.user!.family_id, category_id);
  }

  res.status(201).json({ ...tx, tags: JSON.parse(tx.tags || '[]'), is_recurring: !!tx.is_recurring });
});

router.patch('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
  if (!tx) { res.status(404).json({ error: 'No encontrado' }); return; }

  const { amount, currency, category_id, description, date, tags } = req.body;
  const rates = db.prepare("SELECT rate FROM exchange_rates WHERE from_curr = ? AND to_curr = 'CLP'").get(currency ?? tx.currency) as any;
  const rate = rates?.rate ?? 1;
  const newAmount = amount ?? tx.amount;
  const newCurrency = currency ?? tx.currency;
  const amount_clp = newCurrency === 'CLP' ? newAmount : newAmount * rate;

  db.prepare(`
    UPDATE transactions SET amount = ?, currency = ?, amount_clp = ?, category_id = ?, description = ?,
    date = ?, tags = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newAmount, newCurrency, amount_clp, category_id ?? tx.category_id, description ?? tx.description,
         date ?? tx.date, tags ? JSON.stringify(tags) : tx.tags, req.params.id);

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, tags: JSON.parse(updated.tags || '[]'), is_recurring: !!updated.is_recurring });
});

router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (r.changes === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).send();
});

export default router;
