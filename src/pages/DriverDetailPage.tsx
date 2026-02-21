import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { Shield, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/features/PageHeader';
import { StatusBadge } from '@/components/features/StatusBadge';
import { DataTable } from '@/components/features/DataTable';
import { AlertBanner } from '@/components/features/AlertBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useDriver, useDriverViolations } from '@/hooks/use-fleet-data';
import { useAuthStore } from '@/stores/auth.store';
import { DRIVER_STATUS_COLORS, SEVERITY_COLORS } from '@/constants';
import { ViolationSeverity, UserRole } from '@/types';
import type { ViolationRecord } from '@/types';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';

const violationSchema = z.object({
  type: z.string().trim().min(1, 'Required').max(100),
  description: z.string().trim().min(1, 'Required').max(500),
  severity: z.nativeEnum(ViolationSeverity),
  date: z.string().min(1, 'Required'),
});

type ViolationForm = z.infer<typeof violationSchema>;

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [violationOpen, setViolationOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useDriver(id || '');
  const { data: violations } = useDriverViolations(id || '');

  const canRecordViolation = user && (user.role === UserRole.ADMIN || user.role === UserRole.SAFETY_OFFICER);

  const violationMutation = useMutation({
    mutationFn: (data: Partial<ViolationRecord>) => api.drivers.recordViolation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-violations'] });
      setViolationOpen(false);
      toast({ title: 'Violation recorded' });
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ViolationForm>({
    resolver: zodResolver(violationSchema),
  });

  if (isLoading) return <div className="space-y-4 animate-fade-in"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-lg" /></div>;
  if (!driver) return <p className="text-muted-foreground p-8 text-center">Driver not found</p>;

  const daysToExpiry = Math.ceil((new Date(driver.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const safetyColor = driver.safetyScore >= 80 ? 'hsl(142, 71%, 45%)' : driver.safetyScore >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)';
  const gaugeData = [{ value: driver.safetyScore, fill: safetyColor }];

  const violationColumns = [
    { key: 'type', header: 'Type' },
    { key: 'severity', header: 'Severity', render: (v: ViolationRecord) => (
      <StatusBadge variant={SEVERITY_COLORS[v.severity] as 'info' | 'warning' | 'destructive'}>{v.severity}</StatusBadge>
    )},
    { key: 'description', header: 'Description' },
    { key: 'date', header: 'Date' },
    { key: 'reportedBy', header: 'Reported By' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={driver.name}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Drivers', href: '/drivers' }, { label: driver.name }]}
        action={canRecordViolation ? (
          <Button variant="destructive" onClick={() => setViolationOpen(true)}>
            <AlertTriangle className="mr-2 h-4 w-4" />Record Violation
          </Button>
        ) : undefined}
      />

      {daysToExpiry < 30 && daysToExpiry > 0 && (
        <AlertBanner severity="warning" message={`License expires in ${daysToExpiry} days (${driver.licenseExpiry})`} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {driver.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-lg font-bold text-card-foreground">{driver.name}</h2>
              <p className="text-sm text-muted-foreground">{driver.email}</p>
              <StatusBadge variant={DRIVER_STATUS_COLORS[driver.status] as 'success' | 'warning' | 'destructive' | 'secondary'} className="mt-1">
                {driver.status.replace('_', ' ')}
              </StatusBadge>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-card-foreground">{driver.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">License</span><span className="text-card-foreground">{driver.licenseNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="text-card-foreground">Cat {driver.licenseCategory}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expiry</span><span className="text-card-foreground">{driver.licenseExpiry}</span></div>
          </div>
        </div>

        {/* Safety Score Gauge */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-card-foreground mb-2">Safety Score</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={gaugeData} startAngle={180} endAngle={0}>
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-3xl font-bold mt-[-40px]" style={{ color: safetyColor }}>{driver.safetyScore}%</p>
          <p className="text-xs text-muted-foreground mt-2">
            {driver.safetyScore >= 80 ? 'Excellent' : driver.safetyScore >= 60 ? 'Average' : 'Needs Improvement'}
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Performance</h3>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Trips Completed</p>
              <p className="text-2xl font-bold text-card-foreground">{driver.tripsCompleted}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold text-card-foreground">{driver.completionRate}%</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Violations</p>
              <p className="text-2xl font-bold text-card-foreground">{violations?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Violations Table */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Violation History</h3>
        <DataTable<ViolationRecord>
          columns={violationColumns}
          data={violations || []}
          emptyMessage="No violations recorded"
        />
      </div>

      {/* Record Violation Dialog */}
      <Dialog open={violationOpen} onOpenChange={setViolationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Record Violation</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => {
            violationMutation.mutate({ ...d, driverId: id, reportedBy: user?.name || 'Unknown' } as unknown as Partial<ViolationRecord>);
            reset();
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select {...register('type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select...</option>
                {['Speeding', 'Hard Braking', 'Unauthorized Stop', 'Route Deviation', 'Hours Violation'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <select {...register('severity')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.values(ViolationSeverity).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea {...register('description')} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" {...register('date')} /></div>
            <Button type="submit" className="w-full" disabled={violationMutation.isPending}>Record Violation</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
