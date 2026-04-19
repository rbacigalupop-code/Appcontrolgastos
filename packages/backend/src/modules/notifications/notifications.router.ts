import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { unread_only } = req.query;
  const rows = unread_only === 'true'
    ? await sql`SELECT * FROM notifications WHERE user_id = ${req.user!.id} AND is_read = FALSE ORDER BY created_at DESC LIMIT 50`
    : await sql`SELECT * FROM notifications WHERE user_id = ${req.user!.id} ORDER BY created_at DESC LIMIT 50`;
  res.json(rows);
});

router.patch('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  await sql`UPDATE notifications SET is_read = TRUE WHERE user_id = ${req.user!.id}`;
  res.status(204).send();
});

router.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  await sql`UPDATE notifications SET is_read = TRUE WHERE id = ${req.params.id} AND user_id = ${req.user!.id}`;
  res.status(204).send();
});

export default router;
