import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Route, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/features/PageHeader';
import { StatusBadge } from '@/components/features/StatusBadge';
import { ConfirmModal } from '@/components/features/ConfirmModal';
import { useTrips, useAvailableVehicles, useOnDutyDrivers } from '@/hooks/use-fleet-data';
import { TRIP_STATUS_COLORS } from '@/constants';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';
import type { Trip, Vehicle, Driver } from '@/types';

const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  driverId: z.string().min(1, 'Select a driver'),
  origin: z.string().trim().min(1, 'Required').max(100),
  destination: z.string().trim().min(1, 'Required').max(100),
  cargoWeight: z.coerce.number().min(0, 'Must be positive'),
});

type TripForm = z.infer<typeof tripSchema>;

export default function TripsPage() {
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const queryClient = useQueryClient();

  const { data: tripsData, isLoading } = useTrips(page, 10);
  const { data: availableVehicles } = useAvailableVehicles();
  const { data: onDutyDrivers } = useOnDutyDrivers();

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { cargoWeight: 0 },
  });

  const selectedVehicleId = watch('vehicleId');
  const selectedDriverId = watch('driverId');
  const cargoWeight = watch('cargoWeight');

  const selectedVehicle = availableVehicles?.find(v => v.id === selectedVehicleId);
  const selectedDriver = onDutyDrivers?.find(d => d.id === selectedDriverId);

  const capacityExceeded = selectedVehicle && cargoWeight > selectedVehicle.capacity;
  const licenseMismatch = selectedVehicle && selectedDriver &&
    selectedDriver.licenseCategory < selectedVehicle.requiredLicense;

  const createMutation = useMutation({
    mutationFn: (data: Partial<Trip>) => api.trips.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      reset();
      toast({ title: 'Trip created successfully' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.trips.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setCancelTarget(null);
      setCancelReason('');
      toast({ title: 'Trip cancelled' });
    },
  });

  const onSubmit = (data: TripForm) => {
    if (capacityExceeded) return;
    createMutation.mutate(data as unknown as Partial<Trip>);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Trip Dispatcher" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Trips' }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Trip list */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Trips</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)
            ) : tripsData?.data.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No trips found</p>
            ) : (
              tripsData?.data.map(trip => (
                <div key={trip.id} className="rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Route className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{trip.origin} → {trip.destination}</p>
                        <p className="text-xs text-muted-foreground">
                          {trip.vehicle?.plateNumber} · {trip.driver?.name} · {trip.distance ? `${trip.distance} km` : 'TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={TRIP_STATUS_COLORS[trip.status] as 'success' | 'info' | 'warning' | 'destructive' | 'secondary'}>
                        {trip.status.replace('_', ' ')}
                      </StatusBadge>
                      {(trip.status === 'PLANNED' || trip.status === 'IN_PROGRESS') && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelTarget(trip)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {tripsData && tripsData.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm text-muted-foreground">Page {page} of {tripsData.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= tripsData.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>

        {/* Right: Create Trip */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-5 sticky top-0">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Create Trip</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select onValueChange={v => setValue('vehicleId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {availableVehicles?.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plateNumber} — {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId.message}</p>}
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">Capacity: {selectedVehicle.capacity.toLocaleString()} kg · License: Cat {selectedVehicle.requiredLicense}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Driver</Label>
                <Select onValueChange={v => setValue('driverId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {onDutyDrivers?.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name} — Cat {d.licenseCategory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.driverId && <p className="text-xs text-destructive">{errors.driverId.message}</p>}
                {licenseMismatch && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    License mismatch: Driver has Cat {selectedDriver?.licenseCategory}, vehicle requires Cat {selectedVehicle?.requiredLicense}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Origin</Label>
                <Input {...register('origin')} placeholder="Departure city" />
                {errors.origin && <p className="text-xs text-destructive">{errors.origin.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Destination</Label>
                <Input {...register('destination')} placeholder="Arrival city" />
                {errors.destination && <p className="text-xs text-destructive">{errors.destination.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Cargo Weight (kg)</Label>
                <Input type="number" {...register('cargoWeight')} />
                {capacityExceeded && (
                  <p className="text-xs text-destructive">⚠ Exceeds vehicle capacity of {selectedVehicle?.capacity.toLocaleString()} kg</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || !!capacityExceeded}>
                {createMutation.isPending ? 'Creating...' : 'Create Trip'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        onConfirm={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason || 'No reason given' })}
        title="Cancel Trip"
        description={`Cancel trip from ${cancelTarget?.origin} to ${cancelTarget?.destination}?`}
        confirmLabel="Cancel Trip"
        variant="destructive"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
