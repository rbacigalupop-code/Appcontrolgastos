import { getDb } from '../../config/db';

export function checkBudgetAlerts(userId: number, familyId: number | null, categoryId: number) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const budgets = db.prepare(`
    SELECT * FROM budgets WHERE category_id = ? AND (user_id = ? OR family_id = ?)
    AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
  `).all(categoryId, userId, familyId ?? -1, today, today) as any[];

  for (const budget of budgets) {
    const where = familyId
      ? `(user_id = ${userId} OR family_id = ${familyId})`
      : `user_id = ${userId}`;

    const { spent } = db.prepare(`
      SELECT COALESCE(SUM(amount_clp), 0) as spent FROM transactions
      WHERE ${where} AND category_id = ? AND type = 'expense' AND date >= ?
    `).get(categoryId, monthStart) as { spent: number };

    const pct = (spent / budget.amount) * 100;
    if (pct >= budget.alert_at_pct) {
      const existing = db.prepare(`
        SELECT id FROM notifications WHERE user_id = ? AND entity_id = ? AND entity_type = 'budget'
        AND created_at >= date('now', 'start of month')
      `).get(userId, budget.id);
      if (!existing) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type)
          VALUES (?, 'budget_alert', ?, ?, ?, 'budget')
        `).run(
          userId,
          `⚠️ Presupuesto al ${Math.round(pct)}%`,
          `Has usado ${Math.round(pct)}% de tu presupuesto en esta categoría.`,
          budget.id
        );
      }
    }
  }
}
