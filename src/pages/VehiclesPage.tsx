import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/features/PageHeader';
import { DataTable } from '@/components/features/DataTable';
import { StatusBadge } from '@/components/features/StatusBadge';
import { ConfirmModal } from '@/components/features/ConfirmModal';
import { useVehicles } from '@/hooks/use-fleet-data';
import { VEHICLE_STATUS_COLORS } from '@/constants';
import { VehicleStatus, LicenseCategory, type Vehicle } from '@/types';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';

const vehicleSchema = z.object({
  plateNumber: z.string().trim().min(2, 'Required').max(20),
  make: z.string().trim().min(1, 'Required').max(50),
  model: z.string().trim().min(1, 'Required').max(50),
  year: z.coerce.number().min(2000).max(2030),
  type: z.string().min(1, 'Required'),
  capacity: z.coerce.number().min(0),
  fuelType: z.string().min(1, 'Required'),
  requiredLicense: z.nativeEnum(LicenseCategory),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [retireTarget, setRetireTarget] = useState<Vehicle | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const filters = {
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter }),
  };
  const { data, isLoading } = useVehicles(page, 10, filters);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => api.vehicles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDrawerOpen(false);
      toast({ title: 'Vehicle added successfully' });
    },
  });

  const retireMutation = useMutation({
    mutationFn: (id: string) => api.vehicles.retire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setRetireTarget(null);
      toast({ title: 'Vehicle retired', variant: 'destructive' });
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
  });

  const onSubmit = (data: VehicleForm) => {
    createMutation.mutate(data as unknown as Partial<Vehicle>);
    reset();
  };

  const columns = [
    { key: 'plateNumber', header: 'Plate', render: (v: Vehicle) => <span className="font-mono font-medium text-card-foreground">{v.plateNumber}</span> },
    { key: 'make', header: 'Make/Model', render: (v: Vehicle) => `${v.make} ${v.model}` },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status', render: (v: Vehicle) => (
      <StatusBadge variant={VEHICLE_STATUS_COLORS[v.status] as 'success' | 'info' | 'warning' | 'destructive'}>
        {v.status.replace('_', ' ')}
      </StatusBadge>
    )},
    { key: 'odometer', header: 'Odometer', render: (v: Vehicle) => `${v.odometer.toLocaleString()} km` },
    { key: 'actions', header: '', render: (v: Vehicle) => (
      v.status !== VehicleStatus.RETIRED && (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setRetireTarget(v); }}>
          Retire
        </Button>
      )
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Vehicle Registry"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vehicles' }]}
        action={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Vehicle</Button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(VehicleStatus).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['Sedan', 'Van', 'Truck', 'SUV', 'Bus'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable<Vehicle>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        onRowClick={(item) => navigate(`/vehicles/${item.id}`)}
      />

      {/* Add Vehicle Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Add Vehicle</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Plate Number</Label>
              <Input {...register('plateNumber')} placeholder="FL-0001" />
              {errors.plateNumber && <p className="text-xs text-destructive">{errors.plateNumber.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input {...register('make')} placeholder="Toyota" />
                {errors.make && <p className="text-xs text-destructive">{errors.make.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input {...register('model')} placeholder="Hilux" />
                {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" {...register('year')} placeholder="2024" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select {...register('type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {['Sedan', 'Van', 'Truck', 'SUV', 'Bus'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Capacity (kg)</Label>
                <Input type="number" {...register('capacity')} placeholder="1000" />
              </div>
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <select {...register('fuelType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Gasoline">Gasoline</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Required License</Label>
              <select {...register('requiredLicense')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.values(LicenseCategory).map(l => <option key={l} value={l}>Category {l}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Retire Confirmation */}
      <ConfirmModal
        open={!!retireTarget}
        onClose={() => setRetireTarget(null)}
        onConfirm={() => retireTarget && retireMutation.mutate(retireTarget.id)}
        title="Retire Vehicle"
        description={`Are you sure you want to retire ${retireTarget?.plateNumber}? This action is irreversible.`}
        confirmLabel="Retire Vehicle"
        variant="destructive"
        loading={retireMutation.isPending}
      />
    </div>
  );
}
