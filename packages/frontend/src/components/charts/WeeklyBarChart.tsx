import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCLP } from '../../utils/format';

interface Props { data: Array<{ category_name: string; projected_weekly: number; color: string }>; }

export default function WeeklyBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="category_name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 12 }}
          formatter={(v: number) => [formatCLP(v), 'Proyección semanal']}
        />
        <Bar dataKey="projected_weekly" name="Proyección semanal" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.color ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
