import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { FinancialHealth } from '@gastos/shared';

interface Props { health: FinancialHealth; }

export default function HealthScoreGauge({ health }: Props) {
  const color = health.score >= 80 ? '#22c55e' : health.score >= 60 ? '#6366f1' : health.score >= 40 ? '#f59e0b' : '#ef4444';
  const data = [{ value: health.score, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={-180}>
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#1f2937' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{health.score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <span className="font-semibold text-sm" style={{ color }}>{health.label}</span>
      </div>
      <div className="mt-4 w-full space-y-2">
        {[
          { label: 'Tasa de ahorro', value: health.savings_rate, icon: '💰' },
          { label: 'Adherencia presupuesto', value: health.budget_adherence, icon: '🎯' },
          { label: 'Diversif. inversiones', value: health.investment_diversity, icon: '📈' },
          { label: 'Estabilidad de ingresos', value: health.income_stability, icon: '📊' },
        ].map(({ label, value, icon }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{icon} {label}</span>
              <span className="text-white">{value}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
