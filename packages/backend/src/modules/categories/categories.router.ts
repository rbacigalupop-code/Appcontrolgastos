import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CategorySchema } from '@gastos/shared';
import { getDb } from '../../config/db';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const fid = req.user!.family_id;
  const cats = await sql`
    SELECT * FROM categories
    WHERE is_system = TRUE OR family_id = ${fid}
    ORDER BY is_system DESC, name ASC
  `;
  res.json(cats);
});

router.post('/', requireAuth, validate(CategorySchema), async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { name, icon, color, type } = req.body;
  const [cat] = await sql`
    INSERT INTO categories (family_id, name, icon, color, type)
    VALUES (${req.user!.family_id}, ${name}, ${icon ?? null}, ${color ?? null}, ${type})
    RETURNING *
  `;
  res.status(201).json(cat);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [cat] = await sql`SELECT * FROM categories WHERE id = ${req.params.id}`;
  if (!cat || cat.is_system) { res.status(403).json({ error: 'No permitido' }); return; }
  const { name, icon, color } = req.body;
  const [updated] = await sql`
    UPDATE categories SET
      name  = COALESCE(${name ?? null}, name),
      icon  = COALESCE(${icon ?? null}, icon),
      color = COALESCE(${color ?? null}, color)
    WHERE id = ${req.params.id} RETURNING *
  `;
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [cat] = await sql`SELECT * FROM categories WHERE id = ${req.params.id}`;
  if (!cat || cat.is_system) { res.status(403).json({ error: 'No permitido' }); return; }
  await sql`DELETE FROM categories WHERE id = ${req.params.id}`;
  res.status(204).send();
});

export default router;
