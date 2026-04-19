import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';

const router = Router();

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, family_id, email, name, role, avatar_url, currency, created_at FROM users WHERE id = ?'
  ).get(req.user!.id);
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json(user);
});

router.patch('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, currency, avatar_url } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), currency = COALESCE(?, currency), avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
    .run(name ?? null, currency ?? null, avatar_url ?? null, req.user!.id);
  const user = db.prepare('SELECT id, family_id, email, name, role, avatar_url, currency, created_at FROM users WHERE id = ?').get(req.user!.id);
  res.json(user);
});

export default router;
