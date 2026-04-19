import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { SavingsAccountSchema, SavingsMovementSchema } from '@gastos/shared';
import { getDb } from '../../config/db';

const router = Router();

router.get('/accounts', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const accounts = db.prepare(`
    SELECT * FROM savings_accounts
    WHERE user_id = ? OR (is_shared = 1 AND family_id = ?)
    ORDER BY created_at DESC
  `).all(req.user!.id, req.user!.family_id ?? -1);
  res.json(accounts);
});

router.post('/accounts', requireAuth, validate(SavingsAccountSchema), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, institution, color, emoji, balance, currency, goal, is_shared } = req.body;
  const r = db.prepare(`
    INSERT INTO savings_accounts (user_id, family_id, name, institution, color, emoji, balance, currency, goal, is_shared)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user!.id, req.user!.family_id, name, institution ?? null, color, emoji, balance, currency, goal ?? null, is_shared ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/accounts/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const acc = db.prepare('SELECT * FROM savings_accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
  if (!acc) { res.status(404).json({ error: 'No encontrado' }); return; }
  const { name, institution, color, emoji, goal, is_shared } = req.body;
  db.prepare(`UPDATE savings_accounts SET name = COALESCE(?, name), institution = COALESCE(?, institution),
    color = COALESCE(?, color), emoji = COALESCE(?, emoji), goal = COALESCE(?, goal),
    is_shared = COALESCE(?, is_shared) WHERE id = ?`)
    .run(name ?? null, institution ?? null, color ?? null, emoji ?? null, goal ?? null,
         is_shared !== undefined ? (is_shared ? 1 : 0) : null, req.params.id);
  res.json(db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(req.params.id));
});

router.delete('/accounts/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM savings_accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (r.changes === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).send();
});

router.get('/accounts/:id/movements', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const movements = db.prepare(
    'SELECT * FROM savings_movements WHERE savings_account_id = ? ORDER BY date DESC, created_at DESC'
  ).all(req.params.id);
  res.json(movements);
});

router.post('/accounts/:id/movements', requireAuth, validate(SavingsMovementSchema), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const acc = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(req.params.id) as any;
  if (!acc) { res.status(404).json({ error: 'No encontrada' }); return; }

  const { type, amount, description, date } = req.body;
  const delta = type === 'withdrawal' ? -amount : amount;
  db.prepare('UPDATE savings_accounts SET balance = balance + ? WHERE id = ?').run(delta, req.params.id);

  const r = db.prepare(`
    INSERT INTO savings_movements (savings_account_id, user_id, type, amount, description, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, req.user!.id, type, amount, description ?? null, date);

  const updatedAcc = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(req.params.id) as any;
  if (updatedAcc.goal && updatedAcc.balance >= updatedAcc.goal) {
    const exists = db.prepare(`SELECT id FROM notifications WHERE user_id = ? AND entity_id = ? AND entity_type = 'savings'`).get(req.user!.id, acc.id);
    if (!exists) {
      db.prepare(`INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type) VALUES (?, 'savings_goal', ?, ?, ?, 'savings')`)
        .run(req.user!.id, '🎉 Meta de ahorro alcanzada', `¡Alcanzaste tu meta en "${acc.name}"!`, acc.id);
    }
  }

  res.status(201).json(db.prepare('SELECT * FROM savings_movements WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/accounts/:id/movements/:movId', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const mov = db.prepare('SELECT * FROM savings_movements WHERE id = ? AND savings_account_id = ?').get(req.params.movId, req.params.id) as any;
  if (!mov) { res.status(404).json({ error: 'No encontrado' }); return; }
  const delta = mov.type === 'withdrawal' ? mov.amount : -mov.amount;
  db.prepare('UPDATE savings_accounts SET balance = balance + ? WHERE id = ?').run(delta, req.params.id);
  db.prepare('DELETE FROM savings_movements WHERE id = ?').run(req.params.movId);
  res.status(204).send();
});

export default router;
