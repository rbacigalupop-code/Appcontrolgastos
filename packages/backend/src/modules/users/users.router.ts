import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';

const router = Router();

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [user] = await sql`
    SELECT id, family_id, email, name, role, avatar_url, currency, created_at
    FROM users WHERE id = ${req.user!.id}
  `;
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json(user);
});

router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { name, currency, avatar_url } = req.body;
  const [user] = await sql`
    UPDATE users SET
      name       = COALESCE(${name ?? null}, name),
      currency   = COALESCE(${currency ?? null}, currency),
      avatar_url = COALESCE(${avatar_url ?? null}, avatar_url)
    WHERE id = ${req.user!.id}
    RETURNING id, family_id, email, name, role, avatar_url, currency, created_at
  `;
  res.json(user);
});

export default router;
