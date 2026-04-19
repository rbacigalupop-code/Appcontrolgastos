import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const extraNav = [
  { to: '/investments', icon: '📈', label: 'Inversiones', desc: 'Portafolios y proyecciones' },
  { to: '/budgets', icon: '🎯', label: 'Presupuestos', desc: 'Límites por categoría' },
  { to: '/family', icon: '👨‍👩‍👧', label: 'Familia', desc: 'Grupo familiar compartido' },
];

export default function MorePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-white">Más</h2>
      </div>

      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-white text-lg">{user?.name}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        {extraNav.map(({ to, icon, label, desc }) => (
          <NavLink key={to} to={to}
            className="card flex items-center gap-4 hover:border-indigo-500 transition-colors no-underline">
            <span className="text-3xl">{icon}</span>
            <div className="flex-1">
              <p className="font-medium text-white">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <span className="text-gray-600">›</span>
          </NavLink>
        ))}
      </div>

      <button onClick={logout} className="btn-danger w-full mt-4">
        Cerrar sesión
      </button>
    </div>
  );
}
