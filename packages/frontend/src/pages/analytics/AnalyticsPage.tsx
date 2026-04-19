import { useState, useEffect, useCallback } from 'react';
import { analyticsApi, exportApi } from '../../api';
import { formatCLP, monthStartISO, todayISO } from '../../utils/format';
import SpendingLineChart from '../../components/charts/SpendingLineChart';
import CategoryPieChart from '../../components/charts/CategoryPieChart';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useRealTimeRefresh } from '../../hooks/useRealTimeRefresh';

export default function AnalyticsPage() {
  const [daily, setDaily] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projection, setProjection] = useState<{ weeks: number; projections: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, t, c, p] = await Promise.all([
        analyticsApi.daily({ date_from: dateFrom, date_to: dateTo }),
        analyticsApi.trend(12),
        analyticsApi.categoryBreakdown({ date_from: dateFrom, date_to: dateTo }),
        analyticsApi.weeklyProjection(4),
      ]);
      setDaily(d.data);
      setTrend(t.data);
      setCategories(c.data);
      setProjection(p.data);
    } catch {} finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useRealTimeRefresh(load, 15000);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await exportApi.csv({ date_from: dateFrom, date_to: dateTo });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacciones_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {} finally { setExporting(false); }
  };

  if (loading) return <PageLoader />;

  const totalIncome = daily.reduce((s, d) => s + d.income, 0);
  const totalExpense = daily.reduce((s, d) => s + d.expense, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Análisis Financiero</h2>
          <p className="text-gray-400 text-sm">Análisis detallado de tus finanzas</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input className="input text-sm py-1.5" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-gray-500">—</span>
          <input className="input text-sm py-1.5" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button onClick={exportCSV} disabled={exporting} className="btn-secondary text-sm">
            {exporting ? 'Exportando...' : '📥 Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ingresos', value: formatCLP(totalIncome), color: 'text-green-400' },
          { label: 'Gastos', value: formatCLP(totalExpense), color: 'text-red-400' },
          { label: 'Balance', value: formatCLP(totalIncome - totalExpense), color: totalIncome >= totalExpense ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Flujo diario</h3>
        <SpendingLineChart data={daily} />
      </div>

      {/* Trend 12 months */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Tendencia 12 meses</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 12 }} formatter={(v: number) => formatCLP(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'income' ? 'Ingresos' : 'Gastos'} />
            <Bar dataKey="income" name="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Gastos por categoría</h3>
          <CategoryPieChart data={categories} />
          {categories.slice(0, 5).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-800/50 last:border-0 mt-2">
              <span className="flex items-center gap-2 text-gray-300"><span>{c.icon}</span>{c.name}</span>
              <span className="text-white font-medium">{formatCLP(c.total)}</span>
            </div>
          ))}
        </div>

        {/* Weekly projection */}
        <div className="card">
          <h3 className="font-semibold text-white mb-1">Proyección semanal</h3>
          <p className="text-xs text-gray-500 mb-4">Estimación basada en las últimas 12 semanas</p>
          {!projection || projection.projections.length === 0 ? (
            <div className="text-gray-500 text-sm py-8 text-center">Aún no hay suficientes datos para proyectar</div>
          ) : (
            <>
              <div className="space-y-3">
                {projection.projections.slice(0, 6).map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span style={{ color: p.color }}>{p.category_name}</span>
                      <span className="text-white">{formatCLP(p.projected_weekly)}/sem</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((p.projected_weekly / (projection.projections[0]?.projected_weekly || 1)) * 100, 100)}%`, backgroundColor: p.color ?? '#6366f1' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total proyectado ({projection.weeks} sem)</span>
                  <span className="text-white font-semibold">{formatCLP(projection.projections.reduce((s: number, p: any) => s + p.projected_total, 0))}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
