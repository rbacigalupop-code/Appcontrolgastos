import { useState, useEffect, useCallback } from 'react';
import { analyticsApi, transactionsApi, budgetsApi } from '../../api';
import { FinancialHealth, Budget, Transaction } from '@gastos/shared';
import { formatCLP, monthStartISO, todayISO } from '../../utils/format';
import HealthScoreGauge from '../../components/charts/HealthScoreGauge';
import SpendingLineChart from '../../components/charts/SpendingLineChart';
import CategoryPieChart from '../../components/charts/CategoryPieChart';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useRealTimeRefresh } from '../../hooks/useRealTimeRefresh';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [summary, setSummary] = useState<{ total_income: number; total_expense: number; net: number } | null>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [h, s, d, c, b, r] = await Promise.all([
        analyticsApi.healthScore(),
        transactionsApi.summary({ date_from: monthStartISO(), date_to: todayISO() }),
        analyticsApi.daily({ date_from: monthStartISO(), date_to: todayISO() }),
        analyticsApi.categoryBreakdown({ date_from: monthStartISO(), date_to: todayISO() }),
        budgetsApi.list(),
        transactionsApi.list({ limit: 5 }),
      ]);
      setHealth(h.data);
      setSummary(s.data);
      setDaily(d.data);
      setCategories(c.data);
      setBudgets(b.data);
      setRecent(r.data.data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealTimeRefresh(load, 15000);

  if (loading) return <PageLoader />;

  const savingsRate = summary && summary.total_income > 0
    ? ((summary.total_income - summary.total_expense) / summary.total_income * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">Resumen financiero del mes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos del mes', value: formatCLP(summary?.total_income ?? 0), icon: '💰', color: 'text-green-400' },
          { label: 'Gastos del mes', value: formatCLP(summary?.total_expense ?? 0), icon: '💸', color: 'text-red-400' },
          { label: 'Balance neto', value: formatCLP(summary?.net ?? 0), icon: '📊', color: (summary?.net ?? 0) >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Tasa de ahorro', value: `${savingsRate}%`, icon: '🏦', color: 'text-indigo-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Salud Financiera</h3>
          {health ? <HealthScoreGauge health={health} /> : <div className="text-gray-500 text-sm">Sin datos</div>}
          {health && health.tips.length > 0 && (
            <div className="mt-4 space-y-2">
              {health.tips.map((tip, i) => (
                <div key={i} className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">💡 {tip}</div>
              ))}
            </div>
          )}
        </div>

        {/* Trend chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-white mb-4">Flujo diario del mes</h3>
          <SpendingLineChart data={daily} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Gastos por categoría</h3>
          <CategoryPieChart data={categories} />
        </div>

        {/* Budget progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Presupuestos</h3>
            <Link to="/budgets" className="text-xs text-indigo-400 hover:text-indigo-300">Ver todos →</Link>
          </div>
          {budgets.length === 0 ? (
            <div className="text-gray-500 text-sm py-4">No tienes presupuestos activos</div>
          ) : (
            <div className="space-y-3">
              {budgets.slice(0, 5).map(b => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{b.category_icon} {b.category_name ?? 'Sin categoría'}</span>
                    <span className={b.pct_used! > 100 ? 'text-red-400' : b.pct_used! > 80 ? 'text-yellow-400' : 'text-gray-300'}>
                      {formatCLP(b.spent ?? 0)} / {formatCLP(b.amount)} ({b.pct_used}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${b.pct_used! > 100 ? 'bg-red-500' : b.pct_used! > 80 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(b.pct_used ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Transacciones recientes</h3>
          <Link to="/transactions" className="text-xs text-indigo-400 hover:text-indigo-300">Ver todas →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">Sin transacciones recientes</div>
        ) : (
          <div className="space-y-2">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{(tx as any).category_icon ?? (tx.type === 'income' ? '💰' : '💸')}</span>
                  <div>
                    <p className="text-sm text-white">{tx.description ?? (tx as any).category_name ?? 'Sin descripción'}</p>
                    <p className="text-xs text-gray-500">{tx.date}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCLP(tx.amount_clp ?? tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
