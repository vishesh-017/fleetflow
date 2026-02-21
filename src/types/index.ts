// ===== Enums =====
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DISPATCHER = 'DISPATCHER',
  SAFETY_OFFICER = 'SAFETY_OFFICER',
  FINANCE = 'FINANCE',
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_TRANSIT = 'IN_TRANSIT',
  IN_SHOP = 'IN_SHOP',
  RETIRED = 'RETIRED',
}

export enum TripStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DriverStatus {
  ON_DUTY = 'ON_DUTY',
  OFF_DUTY = 'OFF_DUTY',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
}

export enum LicenseCategory {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ExpenseCategory {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  TOLL = 'TOLL',
  PARKING = 'PARKING',
  FINES = 'FINES',
  OTHER = 'OTHER',
}

export enum ViolationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ===== Interfaces =====
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  make: string;
  year: number;
  type: string;
  status: VehicleStatus;
  odometer: number;
  capacity: number;
  fuelType: string;
  requiredLicense: LicenseCategory;
  lastServiceDate?: string;
  nextServiceDue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseCategory: LicenseCategory;
  licenseExpiry: string;
  status: DriverStatus;
  safetyScore: number;
  tripsCompleted: number;
  completionRate: number;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  vehicle?: Vehicle;
  driver?: Driver;
  origin: string;
  destination: string;
  status: TripStatus;
  startTime?: string;
  endTime?: string;
  distance?: number;
  cargoWeight?: number;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string;
  vehicle?: Vehicle;
  liters: number;
  cost: number;
  station: string;
  date: string;
  efficiency?: number;
  isAnomaly: boolean;
  createdAt: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  serviceType: string;
  description: string;
  cost: number;
  odometer: number;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  tripId?: string;
  vehicle?: Vehicle;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface ViolationRecord {
  id: string;
  driverId: string;
  driver?: Driver;
  type: string;
  description: string;
  severity: ViolationSeverity;
  date: string;
  reportedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  lastChangedBy?: string;
  updatedAt: string;
}

// ===== API types =====
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface FleetAnalytics {
  totalVehicles: number;
  activeTrips: number;
  availableVehicles: number;
  inMaintenance: number;
  utilizationRate: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  avgFuelEfficiency: number;
}

export interface CostTrend {
  month: string;
  fuel: number;
  maintenance: number;
  expenses: number;
}

export interface VehicleCostPerKm {
  vehicleId: string;
  plateNumber: string;
  costPerKm: number;
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  apiLatency: number;
  activeSessions: number;
  uptime: string;
}

export interface AlertItem {
  id: string;
  type: 'license_expiry' | 'overdue_maintenance' | 'fuel_anomaly';
  severity: 'warning' | 'error' | 'info';
  message: string;
  entityId: string;
  createdAt: string;
}
