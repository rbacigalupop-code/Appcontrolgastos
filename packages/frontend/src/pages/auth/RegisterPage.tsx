import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al registrarse');
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
          <p className="text-gray-400 mt-2">Crea tu cuenta y empieza a controlar tus finanzas</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Crear cuenta</h2>
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-gray-400 text-sm mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
