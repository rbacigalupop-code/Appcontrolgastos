export const SYSTEM_CATEGORIES = [
  // Ingresos
  { name: 'Sueldo', icon: '💰', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#16a34a', type: 'income' },
  { name: 'Inversiones', icon: '📈', color: '#15803d', type: 'income' },
  { name: 'Arriendo', icon: '🏠', color: '#166534', type: 'income' },
  { name: 'Otros ingresos', icon: '➕', color: '#4ade80', type: 'income' },
  // Gastos
  { name: 'Alimentación', icon: '🛒', color: '#ef4444', type: 'expense' },
  { name: 'Restaurantes', icon: '🍽️', color: '#dc2626', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#f97316', type: 'expense' },
  { name: 'Salud', icon: '🏥', color: '#ec4899', type: 'expense' },
  { name: 'Educación', icon: '📚', color: '#8b5cf6', type: 'expense' },
  { name: 'Entretenimiento', icon: '🎬', color: '#6366f1', type: 'expense' },
  { name: 'Ropa', icon: '👕', color: '#f59e0b', type: 'expense' },
  { name: 'Servicios básicos', icon: '💡', color: '#0ea5e9', type: 'expense' },
  { name: 'Arriendo/Hipoteca', icon: '🏡', color: '#06b6d4', type: 'expense' },
  { name: 'Tecnología', icon: '📱', color: '#3b82f6', type: 'expense' },
  { name: 'Viajes', icon: '✈️', color: '#10b981', type: 'expense' },
  { name: 'Mascotas', icon: '🐾', color: '#a78bfa', type: 'expense' },
  { name: 'Deudas/Cuotas', icon: '💳', color: '#f43f5e', type: 'expense' },
  { name: 'Seguros', icon: '🛡️', color: '#64748b', type: 'expense' },
  { name: 'Otros gastos', icon: '📦', color: '#94a3b8', type: 'expense' },
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CLP: '$',
  USD: 'US$',
  EUR: '€',
  UF: 'UF',
};
