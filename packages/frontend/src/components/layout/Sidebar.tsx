import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const nav = [
  { to: '/', icon: '🏠', label: 'Dashboard' },
  { to: '/transactions', icon: '💸', label: 'Transacciones' },
  { to: '/savings', icon: '🏦', label: 'Ahorros' },
  { to: '/investments', icon: '📈', label: 'Inversiones' },
  { to: '/budgets', icon: '🎯', label: 'Presupuestos' },
  { to: '/analytics', icon: '📊', label: 'Análisis' },
  { to: '/family', icon: '👨‍👩‍👧', label: 'Familia' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-bold">💰</div>
          <div>
            <h1 className="font-bold text-white text-sm">FinanzasApp</h1>
            <p className="text-xs text-gray-500">Control de gastos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full btn-secondary text-sm py-2">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
