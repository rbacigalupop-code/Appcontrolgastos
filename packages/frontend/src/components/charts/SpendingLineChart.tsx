import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCLP, formatShortDate } from '../../utils/format';

interface DataPoint { date: string; income: number; expense: number; net: number; }

export default function SpendingLineChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 12 }}
          labelStyle={{ color: '#e5e7eb' }}
          formatter={(v: number, name: string) => [formatCLP(v), name === 'income' ? 'Ingresos' : name === 'expense' ? 'Gastos' : 'Neto']}
          labelFormatter={formatShortDate}
        />
        <Legend formatter={v => v === 'income' ? 'Ingresos' : v === 'expense' ? 'Gastos' : 'Neto'} wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
