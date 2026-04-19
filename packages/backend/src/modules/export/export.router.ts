import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { getDb } from '../../config/db';

const router = Router();

router.get('/csv', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { date_from, date_to, type } = req.query as Record<string, string>;
  const uid = req.user!.id;
  const fid = req.user!.family_id;

  const rows = await sql`
    SELECT t.date::text, t.type, t.amount, t.currency, t.amount_clp, t.description,
           c.name as category, u.name as user_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE (t.user_id = ${uid} OR t.family_id = ${fid})
    ${type ? sql`AND t.type = ${type}` : sql``}
    ${date_from ? sql`AND t.date >= ${date_from}` : sql``}
    ${date_to ? sql`AND t.date <= ${date_to}` : sql``}
    ORDER BY t.date DESC
  `;

  const header = 'Fecha,Tipo,Monto,Moneda,Monto CLP,Descripción,Categoría,Usuario\n';
  const body = rows.map(r =>
    [r.date, r.type, r.amount, r.currency, r.amount_clp ?? '', r.description ?? '', r.category ?? '', r.user_name ?? '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transacciones.csv"');
  res.send('\uFEFF' + header + body);
});

export default router;
