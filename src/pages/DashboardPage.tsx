import { Truck, Route, Wrench, Activity, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from '@/components/features/PageHeader';
import { StatCard } from '@/components/features/StatCard';
import { StatusBadge } from '@/components/features/StatusBadge';
import { AlertBanner } from '@/components/features/AlertBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetAnalytics, useAlerts, useActiveTrips } from '@/hooks/use-fleet-data';
import { TRIP_STATUS_COLORS } from '@/constants';

const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(199, 89%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

export default function DashboardPage() {
  const { data: analytics, isLoading } = useFleetAnalytics();
  const { data: alerts } = useAlerts();
  const { data: activeTrips } = useActiveTrips();

  const pieData = analytics ? [
    { name: 'Available', value: analytics.availableVehicles },
    { name: 'In Transit', value: analytics.activeTrips },
    { name: 'In Shop', value: analytics.inMaintenance },
    { name: 'Retired', value: analytics.totalVehicles - analytics.availableVehicles - analytics.activeTrips - analytics.inMaintenance },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Command Center" breadcrumbs={[{ label: 'Dashboard' }]} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : analytics ? (
          <>
            <StatCard title="Total Vehicles" value={analytics.totalVehicles} icon={Truck} trend={{ value: 3.2, label: 'vs last month' }} />
            <StatCard title="Active Trips" value={analytics.activeTrips} icon={Route} trend={{ value: 12, label: 'vs yesterday' }} />
            <StatCard title="Fleet Utilization" value={`${analytics.utilizationRate}%`} icon={Activity} trend={{ value: 5.1, label: 'improvement' }} />
            <StatCard title="In Maintenance" value={analytics.inMaintenance} icon={Wrench} trend={{ value: -2, label: 'vs last week' }} />
          </>
        ) : null}
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Alerts</h2>
          {alerts.map(alert => (
            <AlertBanner key={alert.id} severity={alert.severity} message={alert.message} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pie Chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Vehicle Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-3">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Trips */}
        <div className="col-span-1 lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Active Trips</h3>
            <span className="text-xs text-muted-foreground">Auto-refresh: 30s</span>
          </div>
          <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
            {activeTrips?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No active trips</p>}
            {activeTrips?.map(trip => (
              <div key={trip.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Route className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{trip.origin} → {trip.destination}</p>
                    <p className="text-xs text-muted-foreground">{trip.vehicle?.plateNumber} · {trip.driver?.name}</p>
                  </div>
                </div>
                <StatusBadge variant={TRIP_STATUS_COLORS[trip.status] as 'success' | 'info' | 'warning' | 'destructive' | 'secondary'}>
                  {trip.status.replace('_', ' ')}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Avg Fuel Efficiency</span>
            </div>
            <p className="text-xl font-bold text-card-foreground">{analytics.avgFuelEfficiency} km/L</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-muted-foreground">Total Fuel Cost</span>
            </div>
            <p className="text-xl font-bold text-card-foreground">${analytics.totalFuelCost.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-info" />
              <span className="text-sm font-medium text-muted-foreground">Maintenance Cost</span>
            </div>
            <p className="text-xl font-bold text-card-foreground">${analytics.totalMaintenanceCost.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Fuel({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 8h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 1 1 0 0 1 1 1v4"/><path d="M3 22h12"/><path d="M7 9h4"/></svg>;
}
