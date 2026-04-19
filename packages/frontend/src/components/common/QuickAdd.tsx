import { useState } from 'react';
import { transactionsApi, categoriesApi } from '../../api';
import { Category } from '@gastos/shared';
import { todayISO } from '../../utils/format';

interface Props { onSaved?: () => void; }

export default function QuickAdd({ onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const openModal = async () => {
    setOpen(true);
    if (categories.length === 0) {
      const { data } = await categoriesApi.list();
      setCategories(data);
    }
  };

  const save = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      await transactionsApi.create({
        type, amount: parseFloat(amount), currency: 'CLP',
        category_id: categoryId ? parseInt(categoryId) : undefined,
        description: description || undefined,
        date: todayISO(),
        is_recurring: false, tags: [],
      });
      setOpen(false);
      setAmount('');
      setDescription('');
      setCategoryId('');
      onSaved?.();
    } catch {} finally { setSaving(false); }
  };

  const filtered = categories.filter(c => c.type === type || c.type === 'both');

  return (
    <>
      {/* FAB - only on mobile */}
      <button
        onClick={openModal}
        className="md:hidden fixed right-5 z-30 w-14 h-14 bg-indigo-600 rounded-full shadow-xl shadow-indigo-600/40 flex items-center justify-center text-2xl active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}
        aria-label="Registrar gasto rápido"
      >
        ＋
      </button>

      {/* Quick-add sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full md:max-w-sm bg-gray-900 border border-gray-800 rounded-t-3xl md:rounded-2xl shadow-2xl p-5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}>

            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5 md:hidden" />
            <h3 className="font-bold text-white text-lg mb-4">Registrar rápido</h3>

            {/* Type toggle */}
            <div className="flex rounded-xl overflow-hidden bg-gray-800 mb-4">
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setCategoryId(''); }}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${type === t ? (t === 'expense' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'text-gray-400'}`}>
                  {t === 'expense' ? '↓ Gasto' : '↑ Ingreso'}
                </button>
              ))}
            </div>

            {/* Amount — big and prominent */}
            <div className="mb-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400 font-bold">$</span>
                <input
                  type="number" inputMode="decimal" placeholder="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-10 pr-4 py-4 text-3xl font-bold text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-4 gap-2 mb-4 max-h-40 overflow-y-auto">
              {filtered.slice(0, 12).map(c => (
                <button key={c.id} onClick={() => setCategoryId(String(c.id))}
                  className={`flex flex-col items-center p-2 rounded-xl text-xs transition-colors ${categoryId === String(c.id) ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 active:bg-gray-700'}`}>
                  <span className="text-xl mb-0.5">{c.icon}</span>
                  <span className="truncate w-full text-center text-xs leading-tight">{c.name}</span>
                </button>
              ))}
            </div>

            {/* Description */}
            <input className="input mb-4" placeholder="Descripción (opcional)"
              value={description} onChange={e => setDescription(e.target.value)} />

            <button onClick={save} disabled={saving || !amount}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-colors disabled:opacity-50 ${type === 'expense' ? 'bg-red-600 active:bg-red-700' : 'bg-green-600 active:bg-green-700'}`}>
              {saving ? 'Guardando...' : type === 'expense' ? '💸 Guardar gasto' : '💰 Guardar ingreso'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
