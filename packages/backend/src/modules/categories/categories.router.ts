import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CategorySchema } from '@gastos/shared';
import { getDb } from '../../config/db';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const cats = db.prepare(`
    SELECT * FROM categories
    WHERE is_system = 1 OR family_id = ?
    ORDER BY is_system DESC, name ASC
  `).all(req.user!.family_id ?? -1);
  res.json(cats);
});

router.post('/', requireAuth, validate(CategorySchema), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, icon, color, type } = req.body;
  const r = db.prepare(
    'INSERT INTO categories (family_id, name, icon, color, type) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user!.family_id, name, icon ?? null, color ?? null, type);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as any;
  if (!cat || cat.is_system) { res.status(403).json({ error: 'No permitido' }); return; }
  const { name, icon, color } = req.body;
  db.prepare('UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color) WHERE id = ?')
    .run(name ?? null, icon ?? null, color ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as any;
  if (!cat || cat.is_system) { res.status(403).json({ error: 'No permitido' }); return; }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
