import { FinancialHealth } from '@gastos/shared';

interface ScoreInput {
  totalIncome: number;
  totalExpense: number;
  budgetAdherencePct: number;
  numAssetTypes: number;
  numMonthsWithIncome: number;
}

export function computeFinancialHealth(input: ScoreInput): FinancialHealth {
  const { totalIncome, totalExpense, budgetAdherencePct, numAssetTypes, numMonthsWithIncome } = input;

  const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpense) / totalIncome) : 0;
  const savingsScore = Math.min(savingsRate * 2.5, 1) * 30; // max 30 pts

  const budgetScore = (budgetAdherencePct / 100) * 25; // max 25 pts

  const diversityScore = Math.min(numAssetTypes / 4, 1) * 25; // max 25 pts (4 asset types = full)

  const stabilityScore = Math.min(numMonthsWithIncome / 6, 1) * 20; // max 20 pts

  const score = Math.round(savingsScore + budgetScore + diversityScore + stabilityScore);

  const label: FinancialHealth['label'] =
    score >= 80 ? 'Excelente' :
    score >= 60 ? 'Bueno' :
    score >= 40 ? 'Regular' : 'Crítico';

  const tips: string[] = [];
  if (savingsRate < 0.1) tips.push('Intenta ahorrar al menos el 10% de tus ingresos.');
  if (budgetAdherencePct < 70) tips.push('Estás excediendo tus presupuestos con frecuencia.');
  if (numAssetTypes < 2) tips.push('Diversifica tus inversiones en al menos 2 tipos de activos.');
  if (totalIncome === 0) tips.push('Registra tus ingresos para obtener un análisis completo.');
  if (tips.length === 0) tips.push('¡Excelente gestión financiera! Sigue así.');

  return {
    score,
    savings_rate: Math.round(savingsRate * 100),
    budget_adherence: Math.round(budgetAdherencePct),
    investment_diversity: Math.round(Math.min(numAssetTypes / 4, 1) * 100),
    income_stability: Math.round(Math.min(numMonthsWithIncome / 6, 1) * 100),
    label,
    tips,
  };
}
