import { useState, useEffect } from 'react';
import { notificationsApi } from '../../api';
import { Notification } from '@gastos/shared';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = async () => {
    try {
      const { data } = await notificationsApi.list();
      setNotifications(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markAll = async () => {
    await notificationsApi.readAll();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); load(); }} className="relative p-2 rounded-xl hover:bg-gray-800 transition-colors">
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm">Notificaciones</h3>
            {unread > 0 && <button onClick={markAll} className="text-xs text-indigo-400 hover:text-indigo-300">Marcar todas leídas</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">Sin notificaciones</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-800/50 ${n.is_read ? 'opacity-60' : ''}`}>
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-600 mt-1">{new Date(n.created_at).toLocaleString('es-CL')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
