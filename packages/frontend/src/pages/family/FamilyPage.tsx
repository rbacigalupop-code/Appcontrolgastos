import { useState, useEffect } from 'react';
import { familiesApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { usersApi } from '../../api';

export default function FamilyPage() {
  const { user, updateUser } = useAuthStore();
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadFamily = async () => {
    if (!user?.family_id) return;
    try {
      const [f, m, c] = await Promise.all([
        familiesApi.get(user.family_id),
        familiesApi.members(user.family_id),
        familiesApi.inviteCode(user.family_id),
      ]);
      setFamily(f.data);
      setMembers(m.data);
      setInviteCode(c.data.invite_code);
    } catch {}
  };

  useEffect(() => { loadFamily(); }, [user?.family_id]);

  const createFamily = async () => {
    if (!createName) return;
    setLoading(true);
    try {
      await familiesApi.create(createName);
      const { data: me } = await usersApi.me();
      updateUser(me);
      setMsg('¡Grupo familiar creado!');
      loadFamily();
    } catch (e: any) {
      setMsg('Error al crear el grupo');
    } finally { setLoading(false); }
  };

  const joinFamily = async () => {
    if (!joinCode) return;
    setLoading(true);
    try {
      await familiesApi.join(joinCode);
      const { data: me } = await usersApi.me();
      updateUser(me);
      setMsg('¡Te uniste al grupo familiar!');
      loadFamily();
    } catch {
      setMsg('Código inválido');
    } finally { setLoading(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setMsg('Código copiado al portapapeles');
  };

  if (!user?.family_id) {
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <h2 className="text-2xl font-bold text-white">Grupo Familiar</h2>
          <p className="text-gray-400 text-sm">Crea o únete a un grupo para compartir finanzas</p>
        </div>

        {msg && <div className="bg-indigo-900/30 border border-indigo-700 text-indigo-300 px-4 py-3 rounded-xl text-sm">{msg}</div>}

        <div className="card">
          <h3 className="font-semibold text-white mb-4">Crear nuevo grupo</h3>
          <div className="space-y-3">
            <input className="input" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Nombre del grupo (ej: Familia García)" />
            <button onClick={createFamily} disabled={loading || !createName} className="btn-primary w-full">
              {loading ? 'Creando...' : 'Crear grupo'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">Unirse a un grupo</h3>
          <div className="space-y-3">
            <input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Código de invitación (ej: A1B2C3D4)" maxLength={8} />
            <button onClick={joinFamily} disabled={loading || !joinCode} className="btn-primary w-full">
              {loading ? 'Uniéndome...' : 'Unirme al grupo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Grupo Familiar</h2>
        <p className="text-gray-400 text-sm">Miembros y código de invitación</p>
      </div>

      {msg && <div className="bg-indigo-900/30 border border-indigo-700 text-indigo-300 px-4 py-3 rounded-xl text-sm">{msg}</div>}

      {family && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">👨‍👩‍👧</span>
            <div>
              <h3 className="font-bold text-white text-lg">{family.name}</h3>
              <p className="text-xs text-gray-400">Creado el {new Date(family.created_at).toLocaleDateString('es-CL')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Código de invitación</p>
              <p className="font-mono font-bold text-indigo-300 text-lg tracking-widest">{inviteCode}</p>
            </div>
            <button onClick={copyCode} className="btn-secondary text-sm ml-auto">📋 Copiar</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-white mb-4">Miembros ({members.length})</h3>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
              <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-lg font-bold">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{m.name} {m.id === user?.id && <span className="text-xs text-gray-400">(tú)</span>}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                {m.role === 'owner' ? '👑 Admin' : '👤 Miembro'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
