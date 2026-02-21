export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 100,
  MANAGER: 80,
  DISPATCHER: 60,
  SAFETY_OFFICER: 60,
  FINANCE: 60,
};

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'success',
  IN_TRANSIT: 'info',
  IN_SHOP: 'warning',
  RETIRED: 'destructive',
};

export const TRIP_STATUS_COLORS: Record<string, string> = {
  PLANNED: 'secondary',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  ON_DUTY: 'success',
  OFF_DUTY: 'secondary',
  ON_LEAVE: 'warning',
  SUSPENDED: 'destructive',
};

export const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  CRITICAL: 'destructive',
};

export const NAV_ITEMS = [
  { label: 'Command Center', path: '/dashboard', icon: 'LayoutDashboard', roles: ['ADMIN', 'MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCE'] },
  { label: 'Vehicles', path: '/vehicles', icon: 'Truck', roles: ['ADMIN', 'MANAGER', 'DISPATCHER'] },
  { label: 'Trips', path: '/trips', icon: 'Route', roles: ['ADMIN', 'MANAGER', 'DISPATCHER'] },
  { label: 'Maintenance', path: '/maintenance', icon: 'Wrench', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Fuel & Expenses', path: '/fuel-expenses', icon: 'Fuel', roles: ['ADMIN', 'MANAGER', 'FINANCE'] },
  { label: 'Drivers', path: '/drivers', icon: 'Users', roles: ['ADMIN', 'MANAGER', 'SAFETY_OFFICER'] },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3', roles: ['ADMIN', 'MANAGER', 'FINANCE'] },
  { label: 'Admin', path: '/admin', icon: 'Settings', roles: ['ADMIN'] },
];
