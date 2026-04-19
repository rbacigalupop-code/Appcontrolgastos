import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';
import crypto from 'crypto';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const [family] = await sql`INSERT INTO families (name, invite_code) VALUES (${name}, ${code}) RETURNING *`;
  await sql`UPDATE users SET family_id = ${family.id}, role = 'owner' WHERE id = ${req.user!.id}`;
  res.status(201).json(family);
});

router.post('/join', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { invite_code } = req.body;
  const [family] = await sql`SELECT * FROM families WHERE invite_code = ${invite_code}`;
  if (!family) { res.status(404).json({ error: 'Código inválido' }); return; }
  await sql`UPDATE users SET family_id = ${family.id}, role = 'member' WHERE id = ${req.user!.id}`;
  res.json(family);
});

router.get('/:id/members', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const members = await sql`
    SELECT id, name, email, role, avatar_url, currency, created_at
    FROM users WHERE family_id = ${req.params.id}
  `;
  res.json(members);
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [family] = await sql`SELECT * FROM families WHERE id = ${req.params.id}`;
  res.json(family ?? null);
});

router.get('/:id/invite-code', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [family] = await sql`SELECT invite_code FROM families WHERE id = ${req.params.id}`;
  res.json({ invite_code: family?.invite_code });
});

export default router;
