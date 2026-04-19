import { useState, useEffect, useCallback } from 'react';
import { transactionsApi, categoriesApi } from '../../api';
import { Transaction, Category } from '@gastos/shared';
import { formatCLP, formatDate, todayISO } from '../../utils/format';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { PageLoader } from '../../components/common/LoadingSpinner';

const EMPTY_FORM = { type: 'expense', amount: '', currency: 'CLP', category_id: '', description: '', date: todayISO(), is_recurring: false, recurrence: '', tags: '' };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filter, setFilter] = useState({ type: '', date_from: '', date_to: '', search: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        transactionsApi.list({ ...filter, page, limit: 20 }),
        categoriesApi.list(),
      ]);
      setTransactions(txRes.data.data);
      setTotal(txRes.data.total);
      setCategories(catRes.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTx(null); setForm({ ...EMPTY_FORM }); setModalOpen(true); };
  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setForm({ type: tx.type, amount: String(tx.amount), currency: tx.currency, category_id: String(tx.category_id ?? ''), description: tx.description ?? '', date: tx.date, is_recurring: tx.is_recurring, recurrence: tx.recurrence ?? '', tags: tx.tags.join(', ') });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        type: form.type, amount: parseFloat(form.amount), currency: form.currency,
        category_id: form.category_id ? parseInt(form.category_id) : undefined,
        description: form.description || undefined, date: form.date,
        is_recurring: form.is_recurring, recurrence: form.recurrence || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (editTx) {
        await transactionsApi.update(editTx.id, payload);
      } else {
        await transactionsApi.create(payload);
      }
      setModalOpen(false);
      load();
    } catch {} finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    await transactionsApi.delete(id);
    load();
  };

  const filteredCategories = categories.filter(c => c.type === form.type || c.type === 'both');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Transacciones</h2>
          <p className="text-gray-400 text-sm">{total} registros en total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Nueva transacción</button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <select className="input flex-1 min-w-32" value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
          <option value="">Todos los tipos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <input className="input flex-1 min-w-40" type="date" value={filter.date_from} onChange={e => setFilter({ ...filter, date_from: e.target.value })} placeholder="Desde" />
        <input className="input flex-1 min-w-40" type="date" value={filter.date_to} onChange={e => setFilter({ ...filter, date_to: e.target.value })} placeholder="Hasta" />
        <input className="input flex-1 min-w-48" placeholder="Buscar..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
        <button onClick={() => setFilter({ type: '', date_from: '', date_to: '', search: '' })} className="btn-secondary">Limpiar</button>
      </div>

      {loading ? <PageLoader /> : transactions.length === 0 ? (
        <EmptyState icon="💸" title="Sin transacciones" description="Registra tu primer ingreso o gasto." action={<button onClick={openCreate} className="btn-primary">+ Nueva transacción</button>} />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 text-white">{tx.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-300">
                        <span>{(tx as any).category_icon}</span>
                        {(tx as any).category_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={tx.type === 'income' ? 'badge-income' : 'badge-expense'}>
                        {tx.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold text-right ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCLP(tx.amount_clp ?? tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(tx)} className="text-gray-400 hover:text-white text-sm">✏️</button>
                        <button onClick={() => remove(tx.id)} className="text-gray-400 hover:text-red-400 text-sm">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-800">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1.5">← Anterior</button>
              <span className="text-gray-400 text-sm">Página {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="btn-secondary text-sm py-1.5">Siguiente →</button>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTx ? 'Editar transacción' : 'Nueva transacción'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category_id: '' })}>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto</label>
              <input className="input" type="number" step="any" min="0" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="CLP">CLP ($)</option>
                <option value="USD">USD (US$)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descripción</label>
            <input className="input" placeholder="Descripción opcional" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Etiquetas (separadas por comas)</label>
            <input className="input" placeholder="comida, trabajo..." value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="rounded" />
            <label htmlFor="recurring" className="text-sm text-gray-400">Transacción recurrente</label>
          </div>
          {form.is_recurring && (
            <select className="input" value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}>
              <option value="">Seleccionar frecuencia</option>
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={save} disabled={saving || !form.amount || !form.date} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editTx ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
