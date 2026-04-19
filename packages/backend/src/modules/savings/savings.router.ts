import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { SavingsAccountSchema, SavingsMovementSchema } from '@gastos/shared';
import { getDb } from '../../config/db';

const router = Router();

router.get('/accounts', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const accounts = await sql`
    SELECT * FROM savings_accounts
    WHERE user_id = ${req.user!.id}
       OR (is_shared = TRUE AND family_id = ${req.user!.family_id})
    ORDER BY created_at DESC
  `;
  res.json(accounts);
});

router.post('/accounts', requireAuth, validate(SavingsAccountSchema), async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { name, institution, color, emoji, balance, currency, goal, is_shared } = req.body;
  const [acc] = await sql`
    INSERT INTO savings_accounts (user_id, family_id, name, institution, color, emoji, balance, currency, goal, is_shared)
    VALUES (${req.user!.id}, ${req.user!.family_id}, ${name}, ${institution ?? null}, ${color}, ${emoji},
            ${balance}, ${currency}, ${goal ?? null}, ${is_shared})
    RETURNING *
  `;
  res.status(201).json(acc);
});

router.patch('/accounts/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [acc] = await sql`SELECT * FROM savings_accounts WHERE id = ${req.params.id} AND user_id = ${req.user!.id}`;
  if (!acc) { res.status(404).json({ error: 'No encontrado' }); return; }
  const [updated] = await sql`
    UPDATE savings_accounts SET
      name        = COALESCE(${req.body.name ?? null}, name),
      institution = COALESCE(${req.body.institution ?? null}, institution),
      color       = COALESCE(${req.body.color ?? null}, color),
      emoji       = COALESCE(${req.body.emoji ?? null}, emoji),
      goal        = COALESCE(${req.body.goal ?? null}, goal)
    WHERE id = ${req.params.id} RETURNING *
  `;
  res.json(updated);
});

router.delete('/accounts/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const result = await sql`DELETE FROM savings_accounts WHERE id = ${req.params.id} AND user_id = ${req.user!.id} RETURNING id`;
  if (!result.length) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).send();
});

router.get('/accounts/:id/movements', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const movements = await sql`
    SELECT * FROM savings_movements WHERE savings_account_id = ${req.params.id}
    ORDER BY date DESC, created_at DESC
  `;
  res.json(movements);
});

router.post('/accounts/:id/movements', requireAuth, validate(SavingsMovementSchema), async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [acc] = await sql`SELECT * FROM savings_accounts WHERE id = ${req.params.id}`;
  if (!acc) { res.status(404).json({ error: 'No encontrada' }); return; }

  const { type, amount, description, date } = req.body;
  const delta = type === 'withdrawal' ? -amount : amount;
  await sql`UPDATE savings_accounts SET balance = balance + ${delta} WHERE id = ${req.params.id}`;

  const [mov] = await sql`
    INSERT INTO savings_movements (savings_account_id, user_id, type, amount, description, date)
    VALUES (${req.params.id}, ${req.user!.id}, ${type}, ${amount}, ${description ?? null}, ${date})
    RETURNING *
  `;

  const [updatedAcc] = await sql`SELECT * FROM savings_accounts WHERE id = ${req.params.id}`;
  if (updatedAcc.goal && Number(updatedAcc.balance) >= Number(updatedAcc.goal)) {
    const exists = await sql`
      SELECT id FROM notifications WHERE user_id = ${req.user!.id} AND entity_id = ${acc.id} AND entity_type = 'savings'
    `;
    if (!exists.length) {
      await sql`
        INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type)
        VALUES (${req.user!.id}, 'savings_goal', '🎉 Meta de ahorro alcanzada',
                ${`¡Alcanzaste tu meta en "${acc.name}"!`}, ${acc.id}, 'savings')
      `;
    }
  }

  res.status(201).json(mov);
});

router.delete('/accounts/:id/movements/:movId', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [mov] = await sql`SELECT * FROM savings_movements WHERE id = ${req.params.movId} AND savings_account_id = ${req.params.id}`;
  if (!mov) { res.status(404).json({ error: 'No encontrado' }); return; }
  const delta = mov.type === 'withdrawal' ? Number(mov.amount) : -Number(mov.amount);
  await sql`UPDATE savings_accounts SET balance = balance + ${delta} WHERE id = ${req.params.id}`;
  await sql`DELETE FROM savings_movements WHERE id = ${req.params.movId}`;
  res.status(204).send();
});

export default router;
