import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { unread_only } = req.query;
  const where = unread_only === 'true' ? `user_id = ? AND is_read = 0` : `user_id = ?`;
  const rows = db.prepare(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT 50`).all(req.user!.id);
  res.json(rows);
});

router.patch('/read-all', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.status(204).send();
});

router.patch('/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  res.status(204).send();
});

export default router;
