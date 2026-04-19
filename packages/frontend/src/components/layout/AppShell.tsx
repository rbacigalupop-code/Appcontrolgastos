import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import QuickAdd from '../common/QuickAdd';
import { useAuthStore } from '../../stores/authStore';

export default function AppShell() {
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: visible only on md+ */}
      <div className="hidden md:flex md:flex-col md:w-64 md:flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 flex-shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-base">💰</div>
            <span className="font-bold text-white text-sm">FinanzasApp</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden md:block text-sm text-gray-400">
              Hola, <span className="text-white font-medium">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content — bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto bg-gray-950 p-4 md:p-6 pb-24 md:pb-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
          <Outlet />
        </main>
      </div>

      {/* Quick-add FAB: mobile only */}
      <QuickAdd />

      {/* Bottom nav: mobile only */}
      <BottomNav />
    </div>
  );
}
