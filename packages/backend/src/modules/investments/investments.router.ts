import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { InvestmentAssetSchema } from '@gastos/shared';
import { getDb } from '../../config/db';
import { projectMonthlyReturns } from '../../utils/projections';

const router = Router();

router.get('/portfolios', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const portfolios = db.prepare('SELECT * FROM investment_portfolios WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id) as any[];
  const result = portfolios.map(p => {
    const assets = db.prepare('SELECT * FROM investment_assets WHERE portfolio_id = ?').all(p.id);
    return { ...p, assets };
  });
  res.json(result);
});

router.post('/portfolios', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
  const r = db.prepare('INSERT INTO investment_portfolios (user_id, family_id, name, description) VALUES (?, ?, ?, ?)')
    .run(req.user!.id, req.user!.family_id, name, description ?? null);
  res.status(201).json(db.prepare('SELECT * FROM investment_portfolios WHERE id = ?').get(r.lastInsertRowid));
});

router.post('/portfolios/:id/assets', requireAuth, validate(InvestmentAssetSchema), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, asset_type, ticker, amount_invested, current_value, currency, target_pct, annual_return } = req.body;
  const r = db.prepare(`
    INSERT INTO investment_assets (portfolio_id, name, asset_type, ticker, amount_invested, current_value, currency, target_pct, annual_return)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, name, asset_type, ticker ?? null, amount_invested, current_value, currency, target_pct ?? null, annual_return ?? null);

  recalcAllocations(parseInt(req.params.id));
  checkInvestmentAlerts(req.user!.id, parseInt(req.params.id));

  res.status(201).json(db.prepare('SELECT * FROM investment_assets WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/assets/:assetId', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.prepare('SELECT * FROM investment_assets WHERE id = ?').get(req.params.assetId) as any;
  if (!asset) { res.status(404).json({ error: 'No encontrado' }); return; }
  const { name, current_value, amount_invested, target_pct, annual_return } = req.body;
  db.prepare(`UPDATE investment_assets SET name = COALESCE(?, name), current_value = COALESCE(?, current_value),
    amount_invested = COALESCE(?, amount_invested), target_pct = COALESCE(?, target_pct),
    annual_return = COALESCE(?, annual_return), updated_at = datetime('now') WHERE id = ?`)
    .run(name ?? null, current_value ?? null, amount_invested ?? null, target_pct ?? null, annual_return ?? null, req.params.assetId);

  recalcAllocations(asset.portfolio_id);
  checkInvestmentAlerts(req.user!.id, asset.portfolio_id);

  res.json(db.prepare('SELECT * FROM investment_assets WHERE id = ?').get(req.params.assetId));
});

router.delete('/assets/:assetId', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.prepare('SELECT * FROM investment_assets WHERE id = ?').get(req.params.assetId) as any;
  if (!asset) { res.status(404).json({ error: 'No encontrado' }); return; }
  db.prepare('DELETE FROM investment_assets WHERE id = ?').run(req.params.assetId);
  recalcAllocations(asset.portfolio_id);
  res.status(204).send();
});

router.get('/assets/:assetId/projection', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.prepare('SELECT * FROM investment_assets WHERE id = ?').get(req.params.assetId) as any;
  if (!asset) { res.status(404).json({ error: 'No encontrado' }); return; }
  const months = parseInt(req.query.months as string ?? '24');
  const points = projectMonthlyReturns(asset.current_value, asset.annual_return ?? 5, months);
  res.json(points);
});

router.get('/alerts', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const alerts = db.prepare('SELECT * FROM investment_alerts WHERE user_id = ? AND is_read = 0 ORDER BY triggered_at DESC').all(req.user!.id);
  res.json(alerts);
});

router.patch('/alerts/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE investment_alerts SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  res.status(204).send();
});

function recalcAllocations(portfolioId: number) {
  const db = getDb();
  const assets = db.prepare('SELECT id, current_value FROM investment_assets WHERE portfolio_id = ?').all(portfolioId) as any[];
  const total = assets.reduce((s, a) => s + a.current_value, 0);
  for (const a of assets) {
    const pct = total > 0 ? (a.current_value / total) * 100 : 0;
    db.prepare('UPDATE investment_assets SET allocation_pct = ? WHERE id = ?').run(Math.round(pct * 100) / 100, a.id);
  }
}

function checkInvestmentAlerts(userId: number, portfolioId: number) {
  const db = getDb();
  const assets = db.prepare('SELECT * FROM investment_assets WHERE portfolio_id = ?').all(portfolioId) as any[];
  for (const a of assets) {
    if (a.target_pct !== null && a.allocation_pct !== null) {
      const drift = Math.abs(a.allocation_pct - a.target_pct);
      if (drift > 5) {
        db.prepare(`
          INSERT INTO investment_alerts (user_id, asset_id, alert_type, threshold, message)
          VALUES (?, ?, 'allocation_drift', ?, ?)
        `).run(userId, a.id, 5, `"${a.name}" tiene una desviación de ${drift.toFixed(1)}% respecto a tu asignación objetivo.`);
        db.prepare(`INSERT OR IGNORE INTO notifications (user_id, type, title, body, entity_id, entity_type)
          VALUES (?, 'investment_alert', ?, ?, ?, 'investment_asset')`)
          .run(userId, `⚖️ Rebalanceo sugerido: ${a.name}`, `Desviación de ${drift.toFixed(1)}% respecto al objetivo.`, a.id);
      }
    }
  }
}

export default router;
