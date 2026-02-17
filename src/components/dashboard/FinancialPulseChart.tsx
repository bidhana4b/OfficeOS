import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { revenueChartData as mockRevenueChartData } from './mock-data';

interface FinancialPulseChartProps {
  data?: { day: string; revenue: number; expenses: number }[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-white/[0.1] rounded-lg shadow-xl">
        <p className="font-mono-data text-[10px] text-white/40 mb-1.5">{label}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-titan-cyan" />
            <span className="font-mono-data text-[11px] text-titan-cyan">
              ${payload[0]?.value?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-titan-magenta" />
            <span className="font-mono-data text-[11px] text-titan-magenta">
              ${payload[1]?.value?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function FinancialPulseChart({ data, loading }: FinancialPulseChartProps) {
  const revenueChartData = data && data.length > 0 ? data : mockRevenueChartData;
  const totalRevenue = revenueChartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = revenueChartData.reduce((sum, d) => sum + d.expenses, 0);
  const profit = totalRevenue - totalExpenses;

  return (
    <div className="glass-card border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-4 h-4 text-titan-cyan/60" />
          <h3 className="font-display font-bold text-sm text-white">Financial Pulse</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-titan-cyan" />
            <span className="font-mono-data text-[10px] text-white/40">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-titan-magenta" />
            <span className="font-mono-data text-[10px] text-white/40">Expenses</span>
          </div>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="flex items-center gap-6 px-5 pt-4 pb-2">
        <div>
          <p className="font-mono-data text-[9px] text-white/30">Total Revenue</p>
          <p className="font-display font-bold text-lg text-white">${(totalRevenue / 1000).toFixed(1)}k</p>
        </div>
        <div>
          <p className="font-mono-data text-[9px] text-white/30">Total Expenses</p>
          <p className="font-display font-bold text-lg text-titan-magenta">${(totalExpenses / 1000).toFixed(1)}k</p>
        </div>
        <div>
          <p className="font-mono-data text-[9px] text-white/30">Net Profit</p>
          <p className="font-display font-bold text-lg text-titan-lime">${(profit / 1000).toFixed(1)}k</p>
        </div>
      </div>

      <div className="px-2 pb-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF006E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FF006E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)', fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#00D9FF"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              dot={false}
              activeDot={{ r: 4, fill: '#00D9FF', stroke: '#0A0E27', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#FF006E"
              strokeWidth={1.5}
              fill="url(#colorExpenses)"
              dot={false}
              activeDot={{ r: 4, fill: '#FF006E', stroke: '#0A0E27', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
