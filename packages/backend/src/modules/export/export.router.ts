import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';

const router = Router();

function formatCLP(n: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n); }

router.get('/csv', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { date_from, date_to, type } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;
  const where = fid ? `(t.user_id = ${uid} OR t.family_id = ${fid})` : `t.user_id = ${uid}`;
  const conditions = [where];
  if (type) conditions.push(`t.type = '${type}'`);
  if (date_from) conditions.push(`t.date >= '${date_from}'`);
  if (date_to) conditions.push(`t.date <= '${date_to}'`);

  const rows = db.prepare(`
    SELECT t.date, t.type, t.amount, t.currency, t.amount_clp, t.description, c.name as category, u.name as user
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.date DESC
  `).all() as any[];

  const header = 'Fecha,Tipo,Monto,Moneda,Monto CLP,Descripción,Categoría,Usuario\n';
  const csvBody = rows.map(r =>
    [r.date, r.type, r.amount, r.currency, r.amount_clp ?? '', r.description ?? '', r.category ?? '', r.user ?? '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transacciones.csv"');
  res.send('\uFEFF' + header + csvBody);
});

export default router;
