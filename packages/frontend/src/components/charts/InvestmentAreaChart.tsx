import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCLP } from '../../utils/format';

interface Props { data: Array<{ month: number; value: number }>; }

export default function InvestmentAreaChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="month" tickFormatter={v => `M${v}`} tick={{ fill: '#9ca3af', fontSize: 10 }} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 12 }}
          formatter={(v: number) => [formatCLP(v), 'Valor proyectado']}
          labelFormatter={v => `Mes ${v}`}
        />
        <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#investGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
