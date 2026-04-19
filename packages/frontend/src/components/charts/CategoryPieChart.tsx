import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCLP } from '../../utils/format';

interface Segment { id: number; name: string; icon: string; color: string; total: number; }

export default function CategoryPieChart({ data }: { data: Segment[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Sin datos</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color ?? '#6366f1'} />)}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 12 }}
          formatter={(v: number) => [formatCLP(v)]}
        />
        <Legend formatter={(v, e: any) => `${e.payload.icon ?? ''} ${v}`} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
