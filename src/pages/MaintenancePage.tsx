import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, CheckCircle2, Wrench, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/features/PageHeader';
import { DataTable } from '@/components/features/DataTable';
import { StatusBadge } from '@/components/features/StatusBadge';
import { AlertBanner } from '@/components/features/AlertBanner';
import { useMaintenance, useOverdueMaintenance } from '@/hooks/use-fleet-data';
import { mockVehicles } from '@/services/mock-api';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';
import type { MaintenanceLog } from '@/types';
import { MaintenanceStatus } from '@/types';

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  serviceType: z.string().trim().min(1, 'Required').max(100),
  description: z.string().trim().min(1, 'Required').max(500),
  cost: z.coerce.number().min(0),
  odometer: z.coerce.number().min(0),
  scheduledDate: z.string().min(1, 'Required'),
  notes: z.string().max(500).optional(),
});

type MaintenanceForm = z.infer<typeof maintenanceSchema>;

const STATUS_MAP: Record<string, 'warning' | 'info' | 'success'> = {
  SCHEDULED: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
};

export default function MaintenancePage() {
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useMaintenance(page, 10);
  const { data: overdue } = useOverdueMaintenance();

  const createMutation = useMutation({
    mutationFn: (data: Partial<MaintenanceLog>) => api.maintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setDrawerOpen(false);
      toast({ title: 'Maintenance logged', description: 'Vehicle status updated to IN_SHOP' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.maintenance.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast({ title: 'Maintenance marked as complete' });
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema),
  });

  const onSubmit = (data: MaintenanceForm) => {
    createMutation.mutate(data as unknown as Partial<MaintenanceLog>);
    reset();
  };

  const totalCost = data?.data.reduce((sum, m) => sum + m.cost, 0) || 0;

  const columns = [
    { key: 'vehicle', header: 'Vehicle', render: (m: MaintenanceLog) => (
      <span className="font-mono text-sm">{m.vehicle?.plateNumber || m.vehicleId}</span>
    )},
    { key: 'serviceType', header: 'Service' },
    { key: 'status', header: 'Status', render: (m: MaintenanceLog) => (
      <StatusBadge variant={STATUS_MAP[m.status]}>{m.status.replace('_', ' ')}</StatusBadge>
    )},
    { key: 'cost', header: 'Cost', render: (m: MaintenanceLog) => `$${m.cost.toLocaleString()}` },
    { key: 'odometer', header: 'Odometer', render: (m: MaintenanceLog) => `${m.odometer.toLocaleString()} km` },
    { key: 'scheduledDate', header: 'Scheduled' },
    { key: 'actions', header: '', render: (m: MaintenanceLog) => (
      m.status === MaintenanceStatus.IN_PROGRESS && (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); completeMutation.mutate(m.id); }}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
        </Button>
      )
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Maintenance"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Maintenance' }]}
        action={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" />Log Maintenance</Button>}
      />

      {/* Overdue Alerts */}
      {overdue && overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4" />
            {overdue.length} Upcoming/Overdue
          </div>
          {overdue.slice(0, 3).map(m => (
            <AlertBanner
              key={m.id}
              severity="warning"
              message={`${m.vehicle?.plateNumber || m.vehicleId}: ${m.serviceType} — scheduled ${m.scheduledDate}`}
            />
          ))}
        </div>
      )}

      {/* Cost Summary */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Maintenance Cost (this page)</p>
            <p className="text-xl font-bold text-card-foreground">${totalCost.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <DataTable<MaintenanceLog>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      {/* Log Maintenance Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Log Maintenance</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select onValueChange={v => setValue('vehicleId', v)}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {mockVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plateNumber} — {v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <select {...register('serviceType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select...</option>
                {['Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Tune-up', 'Transmission Service'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.serviceType && <p className="text-xs text-destructive">{errors.serviceType.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Describe the maintenance work" />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input type="number" {...register('cost')} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Odometer (km)</Label>
                <Input type="number" {...register('odometer')} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input type="date" {...register('scheduledDate')} />
              {errors.scheduledDate && <p className="text-xs text-destructive">{errors.scheduledDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea {...register('notes')} placeholder="Additional notes" />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Logging...' : 'Log Maintenance'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
