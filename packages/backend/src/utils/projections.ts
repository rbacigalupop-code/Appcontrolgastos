export function compoundGrowth(presentValue: number, annualRatePct: number, years: number): number {
  return presentValue * Math.pow(1 + annualRatePct / 100, years);
}

export function projectMonthlyReturns(
  currentValue: number,
  annualRatePct: number,
  months: number
): Array<{ month: number; value: number }> {
  const monthlyRate = annualRatePct / 100 / 12;
  const points = [];
  for (let m = 0; m <= months; m++) {
    points.push({ month: m, value: Math.round(currentValue * Math.pow(1 + monthlyRate, m)) });
  }
  return points;
}
