import { useState, useEffect, useCallback } from 'react';
import { savingsApi } from '../../api';
import { SavingsAccount, SavingsMovement } from '@gastos/shared';
import { formatCLP, formatDate, todayISO } from '../../utils/format';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { PageLoader } from '../../components/common/LoadingSpinner';

const ACCOUNT_PRESETS = [
  { name: 'Tenpo', institution: 'Tenpo', emoji: '🟢', color: '#22c55e' },
  { name: 'MercadoPago', institution: 'MercadoPago', emoji: '💙', color: '#3b82f6' },
  { name: 'Cuenta RUT', institution: 'BancoEstado', emoji: '🏦', color: '#6366f1' },
  { name: 'Ahorro personal', institution: '', emoji: '🐷', color: '#f59e0b' },
];

export default function SavingsPage() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [movements, setMovements] = useState<Record<number, SavingsMovement[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAcc, setSelectedAcc] = useState<SavingsAccount | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', institution: '', emoji: '💳', color: '#6366F1', balance: '', currency: 'CLP', goal: '', is_shared: false });
  const [movForm, setMovForm] = useState({ type: 'deposit', amount: '', description: '', date: todayISO() });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await savingsApi.listAccounts();
      setAccounts(data);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadMovements = async (id: number) => {
    const { data } = await savingsApi.listMovements(id);
    setMovements(prev => ({ ...prev, [id]: data }));
  };

  useEffect(() => { load(); }, [load]);

  const selectAccount = (acc: SavingsAccount) => {
    setSelectedAcc(acc);
    loadMovements(acc.id);
  };

  const createAccount = async () => {
    setSaving(true);
    try {
      await savingsApi.createAccount({ ...accountForm, balance: parseFloat(accountForm.balance) || 0, goal: accountForm.goal ? parseFloat(accountForm.goal) : undefined });
      setShowAccountModal(false);
      load();
    } catch {} finally { setSaving(false); }
  };

  const deleteAccount = async (id: number) => {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    await savingsApi.deleteAccount(id);
    if (selectedAcc?.id === id) setSelectedAcc(null);
    load();
  };

  const addMovement = async () => {
    if (!selectedAcc) return;
    setSaving(true);
    try {
      await savingsApi.createMovement(selectedAcc.id, { ...movForm, amount: parseFloat(movForm.amount) });
      setShowMovModal(false);
      const { data: updatedAcc } = await savingsApi.listAccounts();
      setAccounts(updatedAcc);
      const updated = updatedAcc.find((a: SavingsAccount) => a.id === selectedAcc.id);
      if (updated) setSelectedAcc(updated);
      loadMovements(selectedAcc.id);
    } catch {} finally { setSaving(false); }
  };

  const goalPct = (acc: SavingsAccount) => acc.goal ? Math.min((acc.balance / acc.goal) * 100, 100) : null;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Cuentas de Ahorro</h2>
          <p className="text-gray-400 text-sm">Gestiona tus cuentas como Tenpo, MercadoPago, etc.</p>
        </div>
        <button onClick={() => setShowAccountModal(true)} className="btn-primary">+ Nueva cuenta</button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon="🏦" title="Sin cuentas de ahorro" description="Agrega tu primera cuenta para empezar a controlar tus ahorros." action={<button onClick={() => setShowAccountModal(true)} className="btn-primary">+ Agregar cuenta</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc.id}
              onClick={() => selectAccount(acc)}
              className={`relative cursor-pointer rounded-2xl p-5 transition-all hover:scale-105 ${selectedAcc?.id === acc.id ? 'ring-2 ring-indigo-500' : ''}`}
              style={{ background: `linear-gradient(135deg, ${acc.color}22, ${acc.color}44)`, borderColor: acc.color + '44', border: '1px solid' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{acc.emoji}</span>
                  <div>
                    <p className="font-bold text-white">{acc.name}</p>
                    {acc.institution && <p className="text-xs text-gray-400">{acc.institution}</p>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteAccount(acc.id); }} className="text-gray-500 hover:text-red-400 text-sm">🗑️</button>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Saldo disponible</p>
                <p className="text-2xl font-bold text-white">{formatCLP(acc.balance)}</p>
              </div>
              {acc.goal && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Meta: {formatCLP(acc.goal)}</span>
                    <span>{Math.round(goalPct(acc)!)}%</span>
                  </div>
                  <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${goalPct(acc)}%`, backgroundColor: acc.color }} />
                  </div>
                </div>
              )}
              {acc.is_shared && <span className="mt-2 inline-block text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">Compartida</span>}
            </div>
          ))}
        </div>
      )}

      {/* Movements panel */}
      {selectedAcc && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">{selectedAcc.emoji} Movimientos — {selectedAcc.name}</h3>
            <button onClick={() => setShowMovModal(true)} className="btn-primary text-sm py-1.5">+ Movimiento</button>
          </div>
          {!movements[selectedAcc.id] ? (
            <div className="text-gray-500 text-sm py-4">Cargando...</div>
          ) : movements[selectedAcc.id].length === 0 ? (
            <div className="text-gray-500 text-sm py-4">Sin movimientos registrados</div>
          ) : (
            <div className="space-y-2">
              {movements[selectedAcc.id].map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{m.type === 'deposit' ? '⬆️' : m.type === 'withdrawal' ? '⬇️' : '↔️'}</span>
                    <div>
                      <p className="text-sm text-white">{m.description ?? (m.type === 'deposit' ? 'Depósito' : m.type === 'withdrawal' ? 'Retiro' : 'Transferencia')}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.date)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${m.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>
                    {m.type === 'withdrawal' ? '-' : '+'}{formatCLP(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Account Modal */}
      <Modal open={showAccountModal} onClose={() => setShowAccountModal(false)} title="Nueva cuenta de ahorro">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {ACCOUNT_PRESETS.map(p => (
              <button key={p.name} onClick={() => setAccountForm(f => ({ ...f, name: p.name, institution: p.institution, emoji: p.emoji, color: p.color }))}
                className="flex flex-col items-center p-2 rounded-xl border border-gray-700 hover:border-indigo-500 transition-colors text-xs text-gray-300">
                <span className="text-2xl mb-1">{p.emoji}</span>{p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nombre</label><input className="input" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} /></div>
            <div><label className="label">Institución</label><input className="input" value={accountForm.institution} onChange={e => setAccountForm({ ...accountForm, institution: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Saldo inicial</label><input className="input" type="number" min="0" value={accountForm.balance} onChange={e => setAccountForm({ ...accountForm, balance: e.target.value })} placeholder="0" /></div>
            <div><label className="label">Meta de ahorro</label><input className="input" type="number" min="0" value={accountForm.goal} onChange={e => setAccountForm({ ...accountForm, goal: e.target.value })} placeholder="Opcional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Emoji</label><input className="input" value={accountForm.emoji} onChange={e => setAccountForm({ ...accountForm, emoji: e.target.value })} maxLength={2} /></div>
            <div><label className="label">Color</label><input className="input" type="color" value={accountForm.color} onChange={e => setAccountForm({ ...accountForm, color: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAccountModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={createAccount} disabled={saving || !accountForm.name} className="btn-primary flex-1">
              {saving ? 'Guardando...' : 'Crear cuenta'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal open={showMovModal} onClose={() => setShowMovModal(false)} title="Registrar movimiento">
        <div className="space-y-4">
          <div><label className="label">Tipo</label>
            <select className="input" value={movForm.type} onChange={e => setMovForm({ ...movForm, type: e.target.value })}>
              <option value="deposit">Depósito</option>
              <option value="withdrawal">Retiro</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Monto</label><input className="input" type="number" min="0" value={movForm.amount} onChange={e => setMovForm({ ...movForm, amount: e.target.value })} placeholder="0" /></div>
            <div><label className="label">Fecha</label><input className="input" type="date" value={movForm.date} onChange={e => setMovForm({ ...movForm, date: e.target.value })} /></div>
          </div>
          <div><label className="label">Descripción</label><input className="input" value={movForm.description} onChange={e => setMovForm({ ...movForm, description: e.target.value })} placeholder="Opcional" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowMovModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={addMovement} disabled={saving || !movForm.amount} className="btn-primary flex-1">
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
