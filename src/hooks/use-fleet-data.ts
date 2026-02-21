import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/mock-api';

export function useFleetAnalytics() {
  return useQuery({
    queryKey: ['fleet-analytics'],
    queryFn: api.analytics.getFleetUtilization,
    refetchInterval: 30000,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: api.analytics.getAlerts,
    refetchInterval: 30000,
  });
}

export function useActiveTrips() {
  return useQuery({
    queryKey: ['active-trips'],
    queryFn: api.trips.getActive,
    refetchInterval: 30000,
  });
}

export function useVehicles(page: number, pageSize: number, filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['vehicles', page, pageSize, filters],
    queryFn: () => api.vehicles.list(page, pageSize, filters),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => api.vehicles.getById(id),
    enabled: !!id,
  });
}

export function useAvailableVehicles() {
  return useQuery({
    queryKey: ['vehicles-available'],
    queryFn: api.vehicles.getAvailable,
  });
}

export function useTrips(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['trips', page, pageSize],
    queryFn: () => api.trips.list(page, pageSize),
  });
}

export function useOnDutyDrivers() {
  return useQuery({
    queryKey: ['drivers-on-duty'],
    queryFn: api.drivers.getOnDuty,
  });
}

export function useDrivers(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['drivers', page, pageSize],
    queryFn: () => api.drivers.list(page, pageSize),
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: ['driver', id],
    queryFn: () => api.drivers.getById(id),
    enabled: !!id,
  });
}

export function useDriverViolations(driverId: string) {
  return useQuery({
    queryKey: ['driver-violations', driverId],
    queryFn: () => api.drivers.getViolations(driverId),
    enabled: !!driverId,
  });
}

export function useMaintenance(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['maintenance', page, pageSize],
    queryFn: () => api.maintenance.list(page, pageSize),
  });
}

export function useOverdueMaintenance() {
  return useQuery({
    queryKey: ['maintenance-overdue'],
    queryFn: api.maintenance.getOverdue,
  });
}

export function useFuelLogs(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['fuel-logs', page, pageSize],
    queryFn: () => api.fuel.list(page, pageSize),
  });
}

export function useExpenses(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['expenses', page, pageSize],
    queryFn: () => api.expenses.list(page, pageSize),
  });
}

export function useCostTrends() {
  return useQuery({
    queryKey: ['cost-trends'],
    queryFn: api.analytics.getCostTrends,
  });
}

export function useCostPerKm() {
  return useQuery({
    queryKey: ['cost-per-km'],
    queryFn: api.analytics.getCostPerKm,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: api.analytics.getHealth,
    refetchInterval: 10000,
  });
}

export function useSystemConfigs() {
  return useQuery({
    queryKey: ['system-configs'],
    queryFn: api.admin.getConfigs,
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: api.admin.getFeatureFlags,
  });
}

export function useAuditLogs(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['audit-logs', page, pageSize],
    queryFn: () => api.admin.getAuditLogs(page, pageSize),
  });
}
