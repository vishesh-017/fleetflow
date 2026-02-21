import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/features/PageHeader';
import { StatusBadge } from '@/components/features/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useVehicle } from '@/hooks/use-fleet-data';
import { VEHICLE_STATUS_COLORS } from '@/constants';
import { Truck, Gauge, Calendar, Shield } from 'lucide-react';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vehicle, isLoading } = useVehicle(id || '');

  if (isLoading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );

  if (!vehicle) return <p className="text-muted-foreground p-8 text-center">Vehicle not found</p>;

  const infoItems = [
    { icon: Truck, label: 'Type', value: vehicle.type },
    { icon: Gauge, label: 'Odometer', value: `${vehicle.odometer.toLocaleString()} km` },
    { icon: Fuel, label: 'Fuel Type', value: vehicle.fuelType },
    { icon: Shield, label: 'License Required', value: `Category ${vehicle.requiredLicense}` },
    { icon: Calendar, label: 'Last Service', value: vehicle.lastServiceDate || 'N/A' },
    { icon: Calendar, label: 'Next Service Due', value: vehicle.nextServiceDue || 'N/A' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${vehicle.make} ${vehicle.model}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vehicles', href: '/vehicles' },
          { label: vehicle.plateNumber },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-card-foreground">{vehicle.plateNumber}</h2>
                <p className="text-sm text-muted-foreground">{vehicle.make} {vehicle.model} · {vehicle.year}</p>
              </div>
            </div>
            <StatusBadge variant={VEHICLE_STATUS_COLORS[vehicle.status] as 'success' | 'info' | 'warning' | 'destructive'}>
              {vehicle.status.replace('_', ' ')}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {infoItems.map(item => (
              <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-sm font-semibold text-card-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Capacity */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Capacity & Specs</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Load Capacity</p>
              <p className="text-2xl font-bold text-card-foreground">{vehicle.capacity.toLocaleString()} kg</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '65%' }} />
            </div>
            <p className="text-xs text-muted-foreground">Average utilization: 65%</p>
          </div>
        </div>
      </div>

      {/* Status History Timeline */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Status History</h3>
        <div className="space-y-4">
          {[
            { date: '2025-02-18', status: vehicle.status, note: 'Current status' },
            { date: '2025-02-10', status: 'IN_TRANSIT', note: 'Trip #T-1024 completed' },
            { date: '2025-02-05', status: 'IN_SHOP', note: 'Routine oil change' },
            { date: '2025-01-28', status: 'AVAILABLE', note: 'Cleared for dispatch' },
          ].map((event, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                {i < 3 && <div className="flex-1 w-px bg-border" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-card-foreground">{event.status.replace('_', ' ')}</p>
                <p className="text-xs text-muted-foreground">{event.date} · {event.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fuel({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 8h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 1 1 0 0 1 1 1v4"/><path d="M3 22h12"/><path d="M7 9h4"/></svg>;
}
