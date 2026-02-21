import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/features/PageHeader';
import { DataTable } from '@/components/features/DataTable';
import { StatusBadge } from '@/components/features/StatusBadge';
import { AlertBanner } from '@/components/features/AlertBanner';
import { useDrivers } from '@/hooks/use-fleet-data';
import { DRIVER_STATUS_COLORS } from '@/constants';
import type { Driver } from '@/types';

function getSafetyColor(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'destructive';
}

export default function DriversPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, isLoading } = useDrivers(page, 10);

  const expiringDrivers = data?.data.filter(d => {
    const expiry = new Date(d.licenseExpiry);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft < 30 && daysLeft > 0;
  }) || [];

  const columns = [
    { key: 'name', header: 'Name', render: (d: Driver) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {d.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-medium text-card-foreground">{d.name}</p>
          <p className="text-xs text-muted-foreground">{d.email}</p>
        </div>
      </div>
    )},
    { key: 'licenseCategory', header: 'License', render: (d: Driver) => `Cat ${d.licenseCategory}` },
    { key: 'status', header: 'Status', render: (d: Driver) => (
      <StatusBadge variant={DRIVER_STATUS_COLORS[d.status] as 'success' | 'warning' | 'destructive' | 'secondary'}>
        {d.status.replace('_', ' ')}
      </StatusBadge>
    )},
    { key: 'safetyScore', header: 'Safety Score', render: (d: Driver) => (
      <StatusBadge variant={getSafetyColor(d.safetyScore)} dot={false}>{d.safetyScore}%</StatusBadge>
    )},
    { key: 'tripsCompleted', header: 'Trips', render: (d: Driver) => d.tripsCompleted },
    { key: 'licenseExpiry', header: 'License Expiry' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Driver Profiles" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Drivers' }]} />

      {expiringDrivers.length > 0 && (
        <div className="space-y-2">
          {expiringDrivers.map(d => (
            <AlertBanner key={d.id} severity="warning" message={`${d.name}'s license expires on ${d.licenseExpiry}`} />
          ))}
        </div>
      )}

      <DataTable<Driver>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        onRowClick={(d) => navigate(`/drivers/${d.id}`)}
      />
    </div>
  );
}
