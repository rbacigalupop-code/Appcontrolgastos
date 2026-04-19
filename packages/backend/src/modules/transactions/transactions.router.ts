import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { TransactionSchema } from '@gastos/shared';
import { getDb } from '../../config/db';
import { checkBudgetAlerts } from '../budgets/budgets.service';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { type, category_id, date_from, date_to, search, page = '1', limit = '50', scope } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const rows = await sql`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           u.name as user_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE (
      ${scope === 'family' && fid ? sql`t.family_id = ${fid}` : sql`t.user_id = ${uid}`}
    )
    ${type ? sql`AND t.type = ${type}` : sql``}
    ${category_id ? sql`AND t.category_id = ${parseInt(category_id)}` : sql``}
    ${date_from ? sql`AND t.date >= ${date_from}` : sql``}
    ${date_to ? sql`AND t.date <= ${date_to}` : sql``}
    ${search ? sql`AND t.description ILIKE ${'%' + search + '%'}` : sql``}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `;

  const [{ total }] = await sql`
    SELECT COUNT(*) as total FROM transactions t
    WHERE (
      ${scope === 'family' && fid ? sql`t.family_id = ${fid}` : sql`t.user_id = ${uid}`}
    )
    ${type ? sql`AND t.type = ${type}` : sql``}
    ${category_id ? sql`AND t.category_id = ${parseInt(category_id)}` : sql``}
    ${date_from ? sql`AND t.date >= ${date_from}` : sql``}
    ${date_to ? sql`AND t.date <= ${date_to}` : sql``}
    ${search ? sql`AND t.description ILIKE ${'%' + search + '%'}` : sql``}
  `;

  res.json({ data: rows, total: parseInt(total), page: parseInt(page), limit: parseInt(limit) });
});

router.get('/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { date_from, date_to } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const [row] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount_clp ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_clp ELSE 0 END), 0) as total_expense,
      COUNT(*) as count
    FROM transactions
    WHERE (user_id = ${uid} OR family_id = ${fid})
    ${date_from ? sql`AND date >= ${date_from}` : sql``}
    ${date_to ? sql`AND date <= ${date_to}` : sql``}
  `;

  res.json({
    total_income: Number(row.total_income),
    total_expense: Number(row.total_expense),
    net: Number(row.total_income) - Number(row.total_expense),
    count: parseInt(row.count),
  });
});

router.post('/', requireAuth, validate(TransactionSchema), async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { type, amount, currency, category_id, description, date, is_recurring, recurrence, tags } = req.body;

  const [rateRow] = await sql`SELECT rate FROM exchange_rates WHERE from_curr = ${currency} AND to_curr = 'CLP'`;
  const rate = rateRow?.rate ?? 1;
  const amount_clp = currency === 'CLP' ? amount : amount * Number(rate);

  const [tx] = await sql`
    INSERT INTO transactions (user_id, family_id, category_id, type, amount, currency, amount_clp, description, date, is_recurring, recurrence, tags)
    VALUES (${req.user!.id}, ${req.user!.family_id}, ${category_id ?? null}, ${type}, ${amount}, ${currency},
            ${amount_clp}, ${description ?? null}, ${date}, ${is_recurring}, ${recurrence ?? null}, ${tags})
    RETURNING *
  `;

  const [full] = await sql`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ${tx.id}
  `;

  if (type === 'expense' && category_id) {
    checkBudgetAlerts(req.user!.id, req.user!.family_id, category_id).catch(() => {});
  }

  res.status(201).json(full);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [tx] = await sql`SELECT * FROM transactions WHERE id = ${req.params.id} AND user_id = ${req.user!.id}`;
  if (!tx) { res.status(404).json({ error: 'No encontrado' }); return; }

  const { amount, currency, category_id, description, date, tags } = req.body;
  const newCurrency = currency ?? tx.currency;
  const newAmount = amount ?? Number(tx.amount);
  const [rateRow] = await sql`SELECT rate FROM exchange_rates WHERE from_curr = ${newCurrency} AND to_curr = 'CLP'`;
  const rate = rateRow?.rate ?? 1;
  const amount_clp = newCurrency === 'CLP' ? newAmount : newAmount * Number(rate);

  const [updated] = await sql`
    UPDATE transactions SET
      amount = ${newAmount}, currency = ${newCurrency}, amount_clp = ${amount_clp},
      category_id = ${category_id ?? tx.category_id},
      description = ${description ?? tx.description},
      date = ${date ?? tx.date},
      tags = ${tags ?? tx.tags},
      updated_at = NOW()
    WHERE id = ${req.params.id} RETURNING *
  `;
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const result = await sql`DELETE FROM transactions WHERE id = ${req.params.id} AND user_id = ${req.user!.id} RETURNING id`;
  if (!result.length) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).send();
});

export default router;
