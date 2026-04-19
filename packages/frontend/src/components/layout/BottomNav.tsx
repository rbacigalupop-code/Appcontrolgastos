import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', icon: '🏠', label: 'Inicio', end: true },
  { to: '/transactions', icon: '💸', label: 'Gastos', end: false },
  { to: '/savings', icon: '🏦', label: 'Ahorros', end: false },
  { to: '/analytics', icon: '📊', label: 'Análisis', end: false },
  { to: '/more', icon: '☰', label: 'Más', end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {nav.map(({ to, icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            }`
          }
        >
          <span className="text-xl mb-0.5">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
