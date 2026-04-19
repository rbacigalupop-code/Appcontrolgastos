import { useState, useEffect, useCallback } from 'react';
import { investmentsApi } from '../../api';
import { InvestmentPortfolio, InvestmentAsset } from '@gastos/shared';
import { formatCLP } from '../../utils/format';
import Modal from '../../components/common/Modal';
import InvestmentAreaChart from '../../components/charts/InvestmentAreaChart';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import EmptyState from '../../components/common/EmptyState';
import { PageLoader } from '../../components/common/LoadingSpinner';

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock: '📈 Acciones', etf: '🗂️ ETF', crypto: '🪙 Crypto',
  fixed_income: '🏦 Renta fija', real_estate: '🏠 Inmueble', other: '📦 Otro',
};
const ASSET_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function InvestmentsPage() {
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<InvestmentPortfolio | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<InvestmentAsset | null>(null);
  const [projection, setProjection] = useState<any[]>([]);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ name: '', description: '' });
  const [assetForm, setAssetForm] = useState({ name: '', asset_type: 'etf', ticker: '', amount_invested: '', current_value: '', currency: 'CLP', target_pct: '', annual_return: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([investmentsApi.listPortfolios(), investmentsApi.alerts()]);
      setPortfolios(p.data);
      setAlerts(a.data);
      if (p.data.length > 0 && !selectedPortfolio) setSelectedPortfolio(p.data[0]);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadProjection = async (asset: InvestmentAsset) => {
    const { data } = await investmentsApi.assetProjection(asset.id, 24);
    setProjection(data);
    setSelectedAsset(asset);
  };

  const createPortfolio = async () => {
    setSaving(true);
    try {
      const { data } = await investmentsApi.createPortfolio(portfolioForm);
      setShowPortfolioModal(false);
      await load();
      setSelectedPortfolio(data);
    } catch {} finally { setSaving(false); }
  };

  const createAsset = async () => {
    if (!selectedPortfolio) return;
    setSaving(true);
    try {
      await investmentsApi.createAsset(selectedPortfolio.id, {
        ...assetForm,
        amount_invested: parseFloat(assetForm.amount_invested),
        current_value: parseFloat(assetForm.current_value),
        target_pct: assetForm.target_pct ? parseFloat(assetForm.target_pct) : undefined,
        annual_return: assetForm.annual_return ? parseFloat(assetForm.annual_return) : undefined,
      });
      setShowAssetModal(false);
      load();
    } catch {} finally { setSaving(false); }
  };

  const deleteAsset = async (assetId: number) => {
    if (!confirm('¿Eliminar este activo?')) return;
    await investmentsApi.deleteAsset(assetId);
    load();
  };

  const dismissAlert = async (id: number) => {
    await investmentsApi.markAlertRead(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const allAssets = portfolios.flatMap(p => p.assets ?? []);
  const totalValue = allAssets.reduce((s, a) => s + a.current_value, 0);
  const totalInvested = allAssets.reduce((s, a) => s + a.amount_invested, 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const pieData = (selectedPortfolio?.assets ?? []).map((a, i) => ({
    name: a.name, value: a.current_value, fill: ASSET_COLORS[i % ASSET_COLORS.length]
  }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Inversiones</h2>
          <p className="text-gray-400 text-sm">Gestiona y proyecta tus inversiones</p>
        </div>
        <button onClick={() => setShowPortfolioModal(true)} className="btn-primary">+ Nuevo portafolio</button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-yellow-900/20 border border-yellow-700/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-yellow-400 text-lg">⚠️</span>
                <p className="text-sm text-yellow-200">{a.message}</p>
              </div>
              <button onClick={() => dismissAlert(a.id)} className="text-gray-400 hover:text-white text-sm ml-4">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Valor actual', value: formatCLP(totalValue), icon: '💼', color: 'text-white' },
          { label: 'Capital invertido', value: formatCLP(totalInvested), icon: '💰', color: 'text-gray-300' },
          { label: 'Retorno total', value: formatCLP(totalReturn), icon: '📈', color: totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Retorno %', value: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`, icon: '📊', color: returnPct >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-2 mb-2"><span>{icon}</span><span className="text-xs text-gray-400">{label}</span></div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {portfolios.length === 0 ? (
        <EmptyState icon="📈" title="Sin portafolios" description="Crea tu primer portafolio de inversiones." action={<button onClick={() => setShowPortfolioModal(true)} className="btn-primary">+ Crear portafolio</button>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio list */}
          <div className="space-y-3">
            {portfolios.map(p => (
              <div key={p.id} onClick={() => setSelectedPortfolio(p)}
                className={`card cursor-pointer transition-all ${selectedPortfolio?.id === p.id ? 'border-indigo-500' : 'hover:border-gray-600'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{p.name}</h4>
                  <span className="text-xs text-gray-400">{p.assets?.length ?? 0} activos</span>
                </div>
                {p.assets && p.assets.length > 0 && (
                  <p className="text-sm font-medium text-indigo-400">{formatCLP(p.assets.reduce((s, a) => s + a.current_value, 0))}</p>
                )}
              </div>
            ))}
          </div>

          {/* Portfolio detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPortfolio && (
              <>
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Asignación — {selectedPortfolio.name}</h3>
                    <button onClick={() => setShowAssetModal(true)} className="btn-primary text-sm py-1.5">+ Activo</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 12 }} formatter={(v: number) => formatCLP(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {(selectedPortfolio.assets ?? []).map((a, i) => (
                        <div key={a.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }} />
                            <span className="text-gray-300 truncate max-w-24">{a.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400">{a.allocation_pct?.toFixed(1) ?? 0}%</span>
                            <button onClick={() => loadProjection(a)} className="text-indigo-400 hover:text-indigo-300 text-xs">📈</button>
                            <button onClick={() => deleteAsset(a.id)} className="text-gray-500 hover:text-red-400 text-xs">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Asset list */}
                {(selectedPortfolio.assets ?? []).map(a => (
                  <div key={a.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">{a.name} {a.ticker ? <span className="text-gray-400 text-sm">({a.ticker})</span> : null}</p>
                        <p className="text-xs text-gray-400">{ASSET_TYPE_LABELS[a.asset_type]}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{formatCLP(a.current_value)}</p>
                        <p className={`text-xs ${a.current_value >= a.amount_invested ? 'text-green-400' : 'text-red-400'}`}>
                          {a.current_value >= a.amount_invested ? '+' : ''}{formatCLP(a.current_value - a.amount_invested)}
                          {' '}({a.amount_invested > 0 ? (((a.current_value - a.amount_invested) / a.amount_invested) * 100).toFixed(1) : 0}%)
                        </p>
                      </div>
                    </div>
                    {a.annual_return != null && (
                      <p className="text-xs text-gray-400">Retorno anual estimado: <span className="text-indigo-300">{a.annual_return}%</span></p>
                    )}
                    {a.target_pct != null && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Asignación actual: {a.allocation_pct?.toFixed(1)}%</span>
                          <span>Objetivo: {a.target_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(a.allocation_pct ?? 0, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Projection */}
                {selectedAsset && projection.length > 0 && (
                  <div className="card">
                    <h4 className="font-semibold text-white mb-3">Proyección 24 meses — {selectedAsset.name}</h4>
                    <InvestmentAreaChart data={projection} />
                    <p className="text-xs text-gray-500 mt-2">
                      Valor final proyectado: <span className="text-indigo-300 font-medium">{formatCLP(projection[projection.length - 1]?.value ?? 0)}</span>
                      {' '}(tasa anual {selectedAsset.annual_return ?? 5}%)
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Portfolio modal */}
      <Modal open={showPortfolioModal} onClose={() => setShowPortfolioModal(false)} title="Nuevo portafolio">
        <div className="space-y-4">
          <div><label className="label">Nombre</label><input className="input" value={portfolioForm.name} onChange={e => setPortfolioForm({ ...portfolioForm, name: e.target.value })} placeholder="Mi portafolio" /></div>
          <div><label className="label">Descripción</label><input className="input" value={portfolioForm.description} onChange={e => setPortfolioForm({ ...portfolioForm, description: e.target.value })} placeholder="Opcional" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowPortfolioModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={createPortfolio} disabled={saving || !portfolioForm.name} className="btn-primary flex-1">{saving ? 'Creando...' : 'Crear'}</button>
          </div>
        </div>
      </Modal>

      {/* Asset modal */}
      <Modal open={showAssetModal} onClose={() => setShowAssetModal(false)} title="Agregar activo">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nombre</label><input className="input" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="S&P 500 ETF" /></div>
            <div><label className="label">Tipo</label>
              <select className="input" value={assetForm.asset_type} onChange={e => setAssetForm({ ...assetForm, asset_type: e.target.value })}>
                {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Ticker (opcional)</label><input className="input" value={assetForm.ticker} onChange={e => setAssetForm({ ...assetForm, ticker: e.target.value })} placeholder="VOO" /></div>
            <div><label className="label">Moneda</label>
              <select className="input" value={assetForm.currency} onChange={e => setAssetForm({ ...assetForm, currency: e.target.value })}>
                <option value="CLP">CLP</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Capital invertido</label><input className="input" type="number" value={assetForm.amount_invested} onChange={e => setAssetForm({ ...assetForm, amount_invested: e.target.value })} placeholder="0" /></div>
            <div><label className="label">Valor actual</label><input className="input" type="number" value={assetForm.current_value} onChange={e => setAssetForm({ ...assetForm, current_value: e.target.value })} placeholder="0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">% objetivo en portafolio</label><input className="input" type="number" min="0" max="100" value={assetForm.target_pct} onChange={e => setAssetForm({ ...assetForm, target_pct: e.target.value })} placeholder="25" /></div>
            <div><label className="label">Retorno anual estimado %</label><input className="input" type="number" step="0.1" value={assetForm.annual_return} onChange={e => setAssetForm({ ...assetForm, annual_return: e.target.value })} placeholder="8" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAssetModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={createAsset} disabled={saving || !assetForm.name || !assetForm.amount_invested || !assetForm.current_value} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Agregar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
