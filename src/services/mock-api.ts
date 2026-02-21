import type {
  User, Vehicle, Driver, Trip, FuelLog, MaintenanceLog, Expense,
  ViolationRecord, AuditLog, SystemConfig, FeatureFlag, FleetAnalytics,
  AlertItem, CostTrend, VehicleCostPerKm, SystemHealth, PaginatedResponse,
} from '@/types';
import {
  UserRole, VehicleStatus, TripStatus, DriverStatus,
  LicenseCategory, MaintenanceStatus, ExpenseCategory, ViolationSeverity,
} from '@/types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const mockUser: User = {
  id: '1', email: 'admin@fleetops.io', name: 'Alex Morgan', role: UserRole.ADMIN,
  tenantId: 't1', createdAt: '2024-01-01', updatedAt: '2024-01-01',
};

const vehicleTypes = ['Sedan', 'Van', 'Truck', 'SUV', 'Bus'];
const makes = ['Toyota', 'Ford', 'Mercedes', 'Volvo', 'Scania'];
const models = ['Hilux', 'Transit', 'Sprinter', 'FH16', 'Irizar'];
const statuses = Object.values(VehicleStatus);

export const mockVehicles: Vehicle[] = Array.from({ length: 48 }, (_, i) => ({
  id: `v${i + 1}`,
  plateNumber: `FL-${String(i + 100).padStart(4, '0')}`,
  model: models[i % models.length],
  make: makes[i % makes.length],
  year: 2020 + (i % 4),
  type: vehicleTypes[i % vehicleTypes.length],
  status: statuses[i % statuses.length],
  odometer: 15000 + Math.floor(Math.random() * 100000),
  capacity: 1000 + (i % 5) * 500,
  fuelType: i % 3 === 0 ? 'Diesel' : 'Gasoline',
  requiredLicense: i % 5 > 2 ? LicenseCategory.C : LicenseCategory.B,
  lastServiceDate: '2024-11-15',
  nextServiceDue: '2025-03-15',
  createdAt: '2024-01-01',
  updatedAt: '2024-12-01',
}));

export const mockDrivers: Driver[] = Array.from({ length: 30 }, (_, i) => ({
  id: `d${i + 1}`,
  userId: `u${i + 10}`,
  name: ['James Wilson', 'Sarah Chen', 'Carlos Rodriguez', 'Emily Patel', 'Michael Okafor',
    'Ana Kowalski', 'David Kim', 'Fatima Hassan', 'Lucas Müller', 'Priya Sharma'][i % 10],
  email: `driver${i + 1}@fleetops.io`,
  phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
  licenseNumber: `LIC-${String(i + 1).padStart(6, '0')}`,
  licenseCategory: Object.values(LicenseCategory)[i % 5],
  licenseExpiry: i % 8 === 0 ? '2025-03-10' : '2026-06-15',
  status: Object.values(DriverStatus)[i % 4],
  safetyScore: 60 + Math.floor(Math.random() * 40),
  tripsCompleted: 50 + Math.floor(Math.random() * 200),
  completionRate: 85 + Math.floor(Math.random() * 15),
  createdAt: '2024-01-01',
  updatedAt: '2024-12-01',
}));

export const mockTrips: Trip[] = Array.from({ length: 25 }, (_, i) => ({
  id: `t${i + 1}`,
  vehicleId: mockVehicles[i % mockVehicles.length].id,
  driverId: mockDrivers[i % mockDrivers.length].id,
  vehicle: mockVehicles[i % mockVehicles.length],
  driver: mockDrivers[i % mockDrivers.length],
  origin: ['New York', 'Chicago', 'Dallas', 'Miami', 'Seattle'][i % 5],
  destination: ['Boston', 'Detroit', 'Houston', 'Orlando', 'Portland'][i % 5],
  status: Object.values(TripStatus)[i % 4],
  startTime: '2025-02-20T08:00:00Z',
  endTime: i % 4 === 2 ? '2025-02-20T16:00:00Z' : undefined,
  distance: 200 + Math.floor(Math.random() * 800),
  cargoWeight: 500 + Math.floor(Math.random() * 2000),
  createdAt: '2025-02-19',
  updatedAt: '2025-02-20',
}));

export const mockFuelLogs: FuelLog[] = Array.from({ length: 40 }, (_, i) => ({
  id: `fl${i + 1}`,
  vehicleId: mockVehicles[i % mockVehicles.length].id,
  vehicle: mockVehicles[i % mockVehicles.length],
  tripId: i % 3 === 0 ? mockTrips[i % mockTrips.length].id : undefined,
  liters: 30 + Math.floor(Math.random() * 70),
  cost: 50 + Math.floor(Math.random() * 150),
  station: ['Shell', 'BP', 'Chevron', 'ExxonMobil', 'Total'][i % 5],
  date: `2025-02-${String(1 + (i % 28)).padStart(2, '0')}`,
  efficiency: 8 + Math.random() * 6,
  isAnomaly: i % 12 === 0,
  createdAt: '2025-02-01',
}));

export const mockMaintenance: MaintenanceLog[] = Array.from({ length: 20 }, (_, i) => ({
  id: `m${i + 1}`,
  vehicleId: mockVehicles[i % mockVehicles.length].id,
  vehicle: mockVehicles[i % mockVehicles.length],
  serviceType: ['Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Tune-up', 'Transmission Service'][i % 5],
  description: 'Routine scheduled maintenance',
  cost: 100 + Math.floor(Math.random() * 900),
  odometer: 15000 + Math.floor(Math.random() * 100000),
  status: Object.values(MaintenanceStatus)[i % 3],
  scheduledDate: `2025-02-${String(1 + (i % 28)).padStart(2, '0')}`,
  completedDate: i % 3 === 2 ? `2025-02-${String(5 + (i % 20)).padStart(2, '0')}` : undefined,
  notes: i % 2 === 0 ? 'All parts replaced as per schedule' : undefined,
  createdAt: '2025-01-15',
}));

export const mockExpenses: Expense[] = Array.from({ length: 30 }, (_, i) => ({
  id: `e${i + 1}`,
  vehicleId: mockVehicles[i % mockVehicles.length].id,
  vehicle: mockVehicles[i % mockVehicles.length],
  tripId: i % 4 === 0 ? mockTrips[i % mockTrips.length].id : undefined,
  category: Object.values(ExpenseCategory)[i % 7],
  amount: 20 + Math.floor(Math.random() * 500),
  date: `2025-02-${String(1 + (i % 28)).padStart(2, '0')}`,
  notes: i % 3 === 0 ? 'Approved by manager' : undefined,
  createdAt: '2025-02-01',
}));

export const mockViolations: ViolationRecord[] = Array.from({ length: 15 }, (_, i) => ({
  id: `vr${i + 1}`,
  driverId: mockDrivers[i % mockDrivers.length].id,
  driver: mockDrivers[i % mockDrivers.length],
  type: ['Speeding', 'Hard Braking', 'Unauthorized Stop', 'Route Deviation', 'Hours Violation'][i % 5],
  description: 'Detected by fleet monitoring system',
  severity: Object.values(ViolationSeverity)[i % 4],
  date: `2025-02-${String(1 + (i % 28)).padStart(2, '0')}`,
  reportedBy: 'System',
  createdAt: '2025-02-01',
}));

export const mockAuditLogs: AuditLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: `al${i + 1}`,
  userId: i % 5 === 0 ? undefined : `u${(i % 10) + 1}`,
  action: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET', 'VEHICLE_CREATED',
    'TRIP_STARTED', 'MAINTENANCE_LOGGED', 'CONFIG_UPDATED'][i % 8],
  ip: `192.168.1.${100 + (i % 50)}`,
  userAgent: 'Mozilla/5.0',
  metadata: i % 3 === 0 ? { detail: 'Additional info' } : undefined,
  createdAt: `2025-02-${String(1 + (i % 28)).padStart(2, '0')}T${String(8 + (i % 12)).padStart(2, '0')}:00:00Z`,
}));

export const mockSystemConfigs: SystemConfig[] = [
  { id: 'sc1', key: 'maintenance_interval_km', value: '10000', description: 'Kilometers between scheduled maintenance', updatedAt: '2025-01-15' },
  { id: 'sc2', key: 'fuel_anomaly_threshold', value: '30', description: 'Percentage deviation to flag as anomaly', updatedAt: '2025-01-15' },
  { id: 'sc3', key: 'license_expiry_warning_days', value: '30', description: 'Days before license expiry to warn', updatedAt: '2025-01-15' },
  { id: 'sc4', key: 'max_trip_duration_hours', value: '12', description: 'Maximum allowed trip duration', updatedAt: '2025-01-15' },
  { id: 'sc5', key: 'safety_score_min', value: '60', description: 'Minimum safety score threshold', updatedAt: '2025-01-15' },
];

export const mockFeatureFlags: FeatureFlag[] = [
  { id: 'ff1', name: 'real_time_tracking', enabled: true, description: 'Enable real-time GPS tracking', lastChangedBy: 'Admin', updatedAt: '2025-02-01' },
  { id: 'ff2', name: 'predictive_maintenance', enabled: true, description: 'AI-powered maintenance predictions', lastChangedBy: 'Admin', updatedAt: '2025-02-01' },
  { id: 'ff3', name: 'driver_scoring_v2', enabled: false, description: 'New driver scoring algorithm', lastChangedBy: 'Admin', updatedAt: '2025-01-20' },
  { id: 'ff4', name: 'expense_auto_categorize', enabled: true, description: 'Auto-categorize expenses using ML', lastChangedBy: 'Admin', updatedAt: '2025-02-10' },
];

const mockAlerts: AlertItem[] = [
  { id: 'a1', type: 'license_expiry', severity: 'warning', message: 'Driver Sarah Chen license expires in 18 days', entityId: 'd2', createdAt: '2025-02-20' },
  { id: 'a2', type: 'overdue_maintenance', severity: 'error', message: 'Vehicle FL-0103 overdue for brake inspection', entityId: 'v4', createdAt: '2025-02-20' },
  { id: 'a3', type: 'fuel_anomaly', severity: 'warning', message: 'Fuel anomaly detected on FL-0112 — 42% above average', entityId: 'v13', createdAt: '2025-02-19' },
  { id: 'a4', type: 'overdue_maintenance', severity: 'error', message: 'Vehicle FL-0107 missed scheduled oil change', entityId: 'v8', createdAt: '2025-02-18' },
];

const mockAnalytics: FleetAnalytics = {
  totalVehicles: 48, activeTrips: 12, availableVehicles: 18, inMaintenance: 6,
  utilizationRate: 72.5, totalFuelCost: 45200, totalMaintenanceCost: 18900, avgFuelEfficiency: 11.3,
};

const mockCostTrends: CostTrend[] = [
  { month: 'Sep', fuel: 6200, maintenance: 3100, expenses: 1800 },
  { month: 'Oct', fuel: 5800, maintenance: 2900, expenses: 2100 },
  { month: 'Nov', fuel: 7100, maintenance: 4200, expenses: 1600 },
  { month: 'Dec', fuel: 6500, maintenance: 3800, expenses: 2400 },
  { month: 'Jan', fuel: 7800, maintenance: 2600, expenses: 1900 },
  { month: 'Feb', fuel: 6900, maintenance: 3400, expenses: 2200 },
];

const mockCostPerKm: VehicleCostPerKm[] = mockVehicles.slice(0, 10).map((v, i) => ({
  vehicleId: v.id, plateNumber: v.plateNumber, costPerKm: 0.3 + Math.random() * 0.7,
}));

const mockHealth: SystemHealth = { database: 'healthy', apiLatency: 42, activeSessions: 127, uptime: '99.97%' };

// ===== Mock API functions =====
export const api = {
  auth: {
    login: async (email: string, _password: string) => {
      await delay(800);
      return { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user: { ...mockUser, email } };
    },
    forgotPassword: async (_email: string) => { await delay(500); return { message: 'OTP sent' }; },
    resetPassword: async (_email: string, _otp: string, _newPassword: string) => { await delay(500); return { message: 'Password reset successfully' }; },
    refresh: async (_refreshToken: string) => { await delay(200); return { accessToken: 'new-mock-token' }; },
  },
  analytics: {
    getFleetUtilization: async () => { await delay(400); return mockAnalytics; },
    getAlerts: async () => { await delay(300); return mockAlerts; },
    getCostTrends: async () => { await delay(400); return mockCostTrends; },
    getCostPerKm: async () => { await delay(400); return mockCostPerKm; },
    getHealth: async () => { await delay(200); return mockHealth; },
  },
  vehicles: {
    list: async (page = 1, pageSize = 10, filters?: { status?: string; type?: string }): Promise<PaginatedResponse<Vehicle>> => {
      await delay(400);
      let filtered = [...mockVehicles];
      if (filters?.status) filtered = filtered.filter(v => v.status === filters.status);
      if (filters?.type) filtered = filtered.filter(v => v.type === filters.type);
      const start = (page - 1) * pageSize;
      return { data: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) };
    },
    getById: async (id: string) => { await delay(300); return mockVehicles.find(v => v.id === id) || mockVehicles[0]; },
    getAvailable: async () => { await delay(300); return mockVehicles.filter(v => v.status === VehicleStatus.AVAILABLE); },
    create: async (data: Partial<Vehicle>) => { await delay(500); return { ...mockVehicles[0], ...data, id: `v${Date.now()}` }; },
    update: async (id: string, data: Partial<Vehicle>) => { await delay(500); const v = mockVehicles.find(x => x.id === id); return { ...v, ...data }; },
    retire: async (id: string) => { await delay(500); return { ...mockVehicles.find(v => v.id === id), status: VehicleStatus.RETIRED }; },
  },
  drivers: {
    list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Driver>> => {
      await delay(400);
      const start = (page - 1) * pageSize;
      return { data: mockDrivers.slice(start, start + pageSize), total: mockDrivers.length, page, pageSize, totalPages: Math.ceil(mockDrivers.length / pageSize) };
    },
    getById: async (id: string) => { await delay(300); return mockDrivers.find(d => d.id === id) || mockDrivers[0]; },
    getOnDuty: async () => { await delay(300); return mockDrivers.filter(d => d.status === DriverStatus.ON_DUTY); },
    getViolations: async (driverId: string) => { await delay(300); return mockViolations.filter(v => v.driverId === driverId); },
    recordViolation: async (data: Partial<ViolationRecord>) => { await delay(500); return { ...mockViolations[0], ...data, id: `vr${Date.now()}` }; },
  },
  trips: {
    list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Trip>> => {
      await delay(400);
      const start = (page - 1) * pageSize;
      return { data: mockTrips.slice(start, start + pageSize), total: mockTrips.length, page, pageSize, totalPages: Math.ceil(mockTrips.length / pageSize) };
    },
    getActive: async () => { await delay(300); return mockTrips.filter(t => t.status === TripStatus.IN_PROGRESS); },
    create: async (data: Partial<Trip>) => { await delay(500); return { ...mockTrips[0], ...data, id: `t${Date.now()}`, status: TripStatus.PLANNED }; },
    cancel: async (id: string, reason: string) => { await delay(500); return { ...mockTrips.find(t => t.id === id), status: TripStatus.CANCELLED, cancelReason: reason }; },
  },
  maintenance: {
    list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<MaintenanceLog>> => {
      await delay(400);
      const start = (page - 1) * pageSize;
      return { data: mockMaintenance.slice(start, start + pageSize), total: mockMaintenance.length, page, pageSize, totalPages: Math.ceil(mockMaintenance.length / pageSize) };
    },
    create: async (data: Partial<MaintenanceLog>) => { await delay(500); return { ...mockMaintenance[0], ...data, id: `m${Date.now()}` }; },
    complete: async (id: string) => { await delay(500); return { ...mockMaintenance.find(m => m.id === id), status: MaintenanceStatus.COMPLETED, completedDate: new Date().toISOString() }; },
    getOverdue: async () => { await delay(300); return mockMaintenance.filter(m => m.status === MaintenanceStatus.SCHEDULED); },
  },
  fuel: {
    list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<FuelLog>> => {
      await delay(400);
      const start = (page - 1) * pageSize;
      return { data: mockFuelLogs.slice(start, start + pageSize), total: mockFuelLogs.length, page, pageSize, totalPages: Math.ceil(mockFuelLogs.length / pageSize) };
    },
    create: async (data: Partial<FuelLog>) => { await delay(500); return { ...mockFuelLogs[0], ...data, id: `fl${Date.now()}` }; },
  },
  expenses: {
    list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Expense>> => {
      await delay(400);
      const start = (page - 1) * pageSize;
      return { data: mockExpenses.slice(start, start + pageSize), total: mockExpenses.length, page, pageSize, totalPages: Math.ceil(mockExpenses.length / pageSize) };
    },
    create: async (data: Partial<Expense>) => { await delay(500); return { ...mockExpenses[0], ...data, id: `e${Date.now()}` }; },
  },
  admin: {
    getConfigs: async () => { await delay(300); return mockSystemConfigs; },
    updateConfig: async (id: string, value: string) => { await delay(500); return { ...mockSystemConfigs.find(c => c.id === id), value }; },
    getFeatureFlags: async () => { await delay(300); return mockFeatureFlags; },
    toggleFlag: async (id: string, enabled: boolean) => { await delay(500); return { ...mockFeatureFlags.find(f => f.id === id), enabled }; },
    getAuditLogs: async (page = 1, pageSize = 20): Promise<PaginatedResponse<AuditLog>> => {
      await delay(400);
      const start = (page - 1) * pageSize;
      return { data: mockAuditLogs.slice(start, start + pageSize), total: mockAuditLogs.length, page, pageSize, totalPages: Math.ceil(mockAuditLogs.length / pageSize) };
    },
  },
};
