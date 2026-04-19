import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../../stores/authStore';

export default function AppShell() {
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-sm text-gray-400">
              Hola, <span className="text-white font-medium">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
