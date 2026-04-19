import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';
import crypto from 'crypto';

const router = Router();

function genCode() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }

router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
  const code = genCode();
  const family = db.prepare('INSERT INTO families (name, invite_code) VALUES (?, ?)').run(name, code);
  db.prepare('UPDATE users SET family_id = ?, role = ? WHERE id = ?').run(family.lastInsertRowid, 'owner', req.user!.id);
  const f = db.prepare('SELECT * FROM families WHERE id = ?').get(family.lastInsertRowid);
  res.status(201).json(f);
});

router.post('/join', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { invite_code } = req.body;
  const family = db.prepare('SELECT * FROM families WHERE invite_code = ?').get(invite_code) as any;
  if (!family) { res.status(404).json({ error: 'Código inválido' }); return; }
  db.prepare('UPDATE users SET family_id = ?, role = ? WHERE id = ?').run(family.id, 'member', req.user!.id);
  res.json(family);
});

router.get('/:id/members', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const members = db.prepare(
    'SELECT id, name, email, role, avatar_url, currency, created_at FROM users WHERE family_id = ?'
  ).all(req.params.id);
  res.json(members);
});

router.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const family = db.prepare('SELECT * FROM families WHERE id = ?').get(req.params.id);
  res.json(family ?? null);
});

router.get('/:id/invite-code', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const family = db.prepare('SELECT invite_code FROM families WHERE id = ?').get(req.params.id) as any;
  res.json({ invite_code: family?.invite_code });
});

export default router;
