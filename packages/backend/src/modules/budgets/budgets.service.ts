import { getDb } from '../../config/db';

export async function checkBudgetAlerts(userId: number, familyId: number | null, categoryId: number) {
  const sql = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const budgets = await sql`
    SELECT * FROM budgets
    WHERE category_id = ${categoryId}
      AND (user_id = ${userId} OR family_id = ${familyId})
      AND start_date <= ${today}
      AND (end_date IS NULL OR end_date >= ${today})
  `;

  for (const budget of budgets) {
    const [{ spent }] = await sql`
      SELECT COALESCE(SUM(amount_clp), 0) as spent FROM transactions
      WHERE (user_id = ${userId} OR family_id = ${familyId})
        AND category_id = ${categoryId}
        AND type = 'expense'
        AND date >= ${monthStart}
    `;
    const pct = (Number(spent) / Number(budget.amount)) * 100;
    if (pct >= budget.alert_at_pct) {
      const existing = await sql`
        SELECT id FROM notifications
        WHERE user_id = ${userId} AND entity_id = ${budget.id} AND entity_type = 'budget'
          AND created_at >= DATE_TRUNC('month', NOW())
      `;
      if (!existing.length) {
        await sql`
          INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type)
          VALUES (${userId}, 'budget_alert',
            ${`⚠️ Presupuesto al ${Math.round(pct)}%`},
            ${`Has usado ${Math.round(pct)}% de tu presupuesto en esta categoría.`},
            ${budget.id}, 'budget')
        `;
      }
    }
  }
}
