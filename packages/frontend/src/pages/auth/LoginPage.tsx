import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, usersApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-3xl font-bold text-white">FinanzasApp</h1>
          <p className="text-gray-400 mt-2">Controla tus finanzas personales y familiares</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesión</h2>
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          <p className="text-center text-gray-400 text-sm mt-4">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
