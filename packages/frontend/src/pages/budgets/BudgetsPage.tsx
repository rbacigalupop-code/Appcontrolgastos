import { useState, useEffect, useCallback } from 'react';
import { budgetsApi, categoriesApi } from '../../api';
import { Budget, Category } from '@gastos/shared';
import { formatCLP, todayISO } from '../../utils/format';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { PageLoader } from '../../components/common/LoadingSpinner';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ category_id: '', period: 'monthly', amount: '', currency: 'CLP', start_date: todayISO().slice(0, 7) + '-01', alert_at_pct: '80' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([budgetsApi.list(), categoriesApi.list()]);
      setBudgets(b.data);
      setCategories(c.data.filter((c: Category) => c.type === 'expense' || c.type === 'both'));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await budgetsApi.create({ ...form, category_id: parseInt(form.category_id), amount: parseFloat(form.amount), alert_at_pct: parseInt(form.alert_at_pct) });
      setModalOpen(false);
      load();
    } catch {} finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await budgetsApi.delete(id);
    load();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Presupuestos</h2>
          <p className="text-gray-400 text-sm">Controla cuánto gastas por categoría</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">+ Nuevo presupuesto</button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState icon="🎯" title="Sin presupuestos" description="Crea presupuestos por categoría para controlar mejor tus gastos." action={<button onClick={() => setModalOpen(true)} className="btn-primary">+ Crear presupuesto</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const pct = b.pct_used ?? 0;
            const barColor = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#6366f1';
            const statusIcon = pct > 100 ? '🔴' : pct > 80 ? '🟡' : '🟢';
            return (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{b.category_icon ?? '📦'}</span>
                    <div>
                      <p className="font-semibold text-white">{b.category_name ?? 'Sin categoría'}</p>
                      <p className="text-xs text-gray-400">{b.period === 'monthly' ? 'Mensual' : 'Semanal'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{statusIcon}</span>
                    <button onClick={() => remove(b.id)} className="text-gray-500 hover:text-red-400 text-sm">🗑️</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400">Gastado</p>
                      <p className={`text-lg font-bold ${pct > 100 ? 'text-red-400' : pct > 80 ? 'text-yellow-400' : 'text-white'}`}>{formatCLP(b.spent ?? 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Presupuesto</p>
                      <p className="text-sm text-gray-300">{formatCLP(b.amount)}</p>
                    </div>
                  </div>

                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{pct}% utilizado</span>
                    <span>Restante: {formatCLP(Math.max(b.amount - (b.spent ?? 0), 0))}</span>
                  </div>
                  <p className="text-xs text-gray-600">Alerta al {b.alert_at_pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo presupuesto">
        <div className="space-y-4">
          <div><label className="label">Categoría</label>
            <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Seleccionar categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Período</label>
              <select className="input" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                <option value="monthly">Mensual</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <div><label className="label">Monto límite</label>
              <input className="input" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div><label className="label">Alerta al (% del presupuesto)</label>
            <input className="input" type="number" min="1" max="100" value={form.alert_at_pct} onChange={e => setForm({ ...form, alert_at_pct: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={save} disabled={saving || !form.category_id || !form.amount} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Crear presupuesto'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
