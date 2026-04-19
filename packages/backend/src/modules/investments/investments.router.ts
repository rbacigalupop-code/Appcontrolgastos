import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { InvestmentAssetSchema } from '@gastos/shared';
import { getDb } from '../../config/db';
import { projectMonthlyReturns } from '../../utils/projections';

const router = Router();

router.get('/portfolios', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const portfolios = await sql`SELECT * FROM investment_portfolios WHERE user_id = ${req.user!.id} ORDER BY created_at DESC`;
  const result = await Promise.all(portfolios.map(async p => {
    const assets = await sql`SELECT * FROM investment_assets WHERE portfolio_id = ${p.id}`;
    return { ...p, assets };
  }));
  res.json(result);
});

router.post('/portfolios', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
  const [p] = await sql`
    INSERT INTO investment_portfolios (user_id, family_id, name, description)
    VALUES (${req.user!.id}, ${req.user!.family_id}, ${name}, ${description ?? null})
    RETURNING *
  `;
  res.status(201).json(p);
});

router.post('/portfolios/:id/assets', requireAuth, validate(InvestmentAssetSchema), async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const { name, asset_type, ticker, amount_invested, current_value, currency, target_pct, annual_return } = req.body;
  const [asset] = await sql`
    INSERT INTO investment_assets (portfolio_id, name, asset_type, ticker, amount_invested, current_value, currency, target_pct, annual_return)
    VALUES (${req.params.id}, ${name}, ${asset_type}, ${ticker ?? null}, ${amount_invested}, ${current_value},
            ${currency}, ${target_pct ?? null}, ${annual_return ?? null})
    RETURNING *
  `;
  await recalcAllocations(parseInt(req.params.id));
  await checkInvestmentAlerts(req.user!.id, parseInt(req.params.id));
  res.status(201).json(asset);
});

router.patch('/assets/:assetId', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [asset] = await sql`SELECT * FROM investment_assets WHERE id = ${req.params.assetId}`;
  if (!asset) { res.status(404).json({ error: 'No encontrado' }); return; }
  const [updated] = await sql`
    UPDATE investment_assets SET
      name            = COALESCE(${req.body.name ?? null}, name),
      current_value   = COALESCE(${req.body.current_value ?? null}, current_value),
      amount_invested = COALESCE(${req.body.amount_invested ?? null}, amount_invested),
      target_pct      = COALESCE(${req.body.target_pct ?? null}, target_pct),
      annual_return   = COALESCE(${req.body.annual_return ?? null}, annual_return),
      updated_at      = NOW()
    WHERE id = ${req.params.assetId} RETURNING *
  `;
  await recalcAllocations(Number(asset.portfolio_id));
  await checkInvestmentAlerts(req.user!.id, Number(asset.portfolio_id));
  res.json(updated);
});

router.delete('/assets/:assetId', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [asset] = await sql`SELECT * FROM investment_assets WHERE id = ${req.params.assetId}`;
  if (!asset) { res.status(404).json({ error: 'No encontrado' }); return; }
  await sql`DELETE FROM investment_assets WHERE id = ${req.params.assetId}`;
  await recalcAllocations(Number(asset.portfolio_id));
  res.status(204).send();
});

router.get('/assets/:assetId/projection', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const [asset] = await sql`SELECT * FROM investment_assets WHERE id = ${req.params.assetId}`;
  if (!asset) { res.status(404).json({ error: 'No encontrado' }); return; }
  const months = parseInt(req.query.months as string ?? '24');
  res.json(projectMonthlyReturns(Number(asset.current_value), Number(asset.annual_return ?? 5), months));
});

router.get('/alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  const alerts = await sql`SELECT * FROM investment_alerts WHERE user_id = ${req.user!.id} AND is_read = FALSE ORDER BY triggered_at DESC`;
  res.json(alerts);
});

router.patch('/alerts/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  const sql = getDb();
  await sql`UPDATE investment_alerts SET is_read = TRUE WHERE id = ${req.params.id} AND user_id = ${req.user!.id}`;
  res.status(204).send();
});

async function recalcAllocations(portfolioId: number) {
  const sql = getDb();
  const assets = await sql`SELECT id, current_value FROM investment_assets WHERE portfolio_id = ${portfolioId}`;
  const total = assets.reduce((s, a) => s + Number(a.current_value), 0);
  await Promise.all(assets.map(a => {
    const pct = total > 0 ? (Number(a.current_value) / total) * 100 : 0;
    return sql`UPDATE investment_assets SET allocation_pct = ${Math.round(pct * 100) / 100} WHERE id = ${a.id}`;
  }));
}

async function checkInvestmentAlerts(userId: number, portfolioId: number) {
  const sql = getDb();
  const assets = await sql`SELECT * FROM investment_assets WHERE portfolio_id = ${portfolioId}`;
  for (const a of assets) {
    if (a.target_pct != null && a.allocation_pct != null) {
      const drift = Math.abs(Number(a.allocation_pct) - Number(a.target_pct));
      if (drift > 5) {
        await sql`
          INSERT INTO investment_alerts (user_id, asset_id, alert_type, threshold, message)
          VALUES (${userId}, ${a.id}, 'allocation_drift', 5,
                  ${`"${a.name}" tiene una desviación de ${drift.toFixed(1)}% respecto a tu asignación objetivo.`})
        `;
        await sql`
          INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type)
          VALUES (${userId}, 'investment_alert', ${`⚖️ Rebalanceo sugerido: ${a.name}`},
                  ${`Desviación de ${drift.toFixed(1)}% respecto al objetivo.`}, ${a.id}, 'investment_asset')
          ON CONFLICT DO NOTHING
        `;
      }
    }
  }
}

export default router;
