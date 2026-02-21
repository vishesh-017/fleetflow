import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/features/PageHeader';
import { StatCard } from '@/components/features/StatCard';
import { useCostTrends, useCostPerKm, useFleetAnalytics } from '@/hooks/use-fleet-data';
import { TrendingUp, TrendingDown, Truck, Fuel } from 'lucide-react';
import type { CostTrend } from '@/types';

const PIE_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(262, 83%, 58%)', 'hsl(199, 89%, 48%)'];

const expenseBreakdown = [
  { name: 'Fuel', value: 45200 }, { name: 'Maintenance', value: 18900 },
  { name: 'Insurance', value: 12400 }, { name: 'Tolls', value: 5600 },
  { name: 'Fines', value: 2100 }, { name: 'Other', value: 3200 },
];

const utilizationData = [
  { month: 'Sep', rate: 68 }, { month: 'Oct', rate: 71 }, { month: 'Nov', rate: 74 },
  { month: 'Dec', rate: 69 }, { month: 'Jan', rate: 76 }, { month: 'Feb', rate: 72.5 },
];

export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState('2024-09-01');
  const [dateTo, setDateTo] = useState('2025-02-28');

  const { data: costTrends, isLoading: trendsLoading } = useCostTrends();
  const { data: costPerKm, isLoading: cpmLoading } = useCostPerKm();
  const { data: analytics } = useFleetAnalytics();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export PDF</Button>
          </div>
        }
      />

      {/* Date Range */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* KPI Summary */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Avg Fuel Efficiency" value={`${analytics.avgFuelEfficiency} km/L`} icon={Truck} trend={{ value: 2.3, label: 'vs prev period' }} />
          <StatCard title="Fleet Utilization" value={`${analytics.utilizationRate}%`} icon={Truck} trend={{ value: 5.1, label: 'improvement' }} />
          <StatCard title="Best Vehicle" value="FL-0104" icon={TrendingUp} />
          <StatCard title="Worst Vehicle" value="FL-0103" icon={TrendingDown} />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost Trend */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Monthly Cost Trend</h3>
          {trendsLoading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="fuel" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="maintenance" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost per KM */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Cost per km (Top 10 Vehicles)</h3>
          {cpmLoading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costPerKm}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="plateNumber" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}/km`} />
                <Bar dataKey="costPerKm" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Expense Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet Utilization Over Time */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Fleet Utilization Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="rate" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function FuelIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 8h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 1 1 0 0 1 1 1v4"/><path d="M3 22h12"/><path d="M7 9h4"/></svg>;
}
