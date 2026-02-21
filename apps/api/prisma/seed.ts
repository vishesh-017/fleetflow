import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'tenant-demo-001';

  // System config
  await prisma.systemConfig.upsert({
    where: { key: 'maintenanceIntervalKm' },
    create: { key: 'maintenanceIntervalKm', value: '10000', description: 'Km between maintenance services' },
    update: {},
  });
  await prisma.systemConfig.upsert({
    where: { key: 'violationPenaltyWeight' },
    create: { key: 'violationPenaltyWeight', value: '5', description: 'Points deducted per violation for safety score' },
    update: {},
  });

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleetguard.com' },
    create: {
      email: 'admin@fleetguard.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      tenantId,
    },
    update: {},
  });

  // Dispatcher
  const dispPassword = await bcrypt.hash('disp123', 10);
  await prisma.user.upsert({
    where: { email: 'dispatcher@fleetguard.com' },
    create: {
      email: 'dispatcher@fleetguard.com',
      password: dispPassword,
      name: 'Dispatch User',
      role: 'DISPATCHER',
      tenantId,
    },
    update: {},
  });

  // Drivers (no userId link for simplicity)
  const driver1 = await prisma.driver.upsert({
    where: { email: 'driver1@fleetguard.com' },
    create: {
      name: 'John Driver',
      email: 'driver1@fleetguard.com',
      phone: '+1234567890',
      licenseNumber: 'DL-001',
      licenseCategory: 'C',
      licenseExpiryDate: new Date(Date.now() + 365 * 86400000),
      status: 'ON_DUTY',
    },
    update: {},
  });

  const driver2 = await prisma.driver.upsert({
    where: { email: 'driver2@fleetguard.com' },
    create: {
      name: 'Jane Driver',
      email: 'driver2@fleetguard.com',
      phone: '+0987654321',
      licenseNumber: 'DL-002',
      licenseCategory: 'B',
      licenseExpiryDate: new Date(Date.now() + 200 * 86400000),
      status: 'OFF_DUTY',
    },
    update: {},
  });

  // Vehicles
  const v1 = await prisma.vehicle.upsert({
    where: { licensePlate: 'ABC-1001' },
    create: {
      licensePlate: 'ABC-1001',
      make: 'Toyota',
      model: 'Hilux',
      year: 2022,
      type: 'TRUCK',
      status: 'AVAILABLE',
      odometer: 15000,
      maxLoadCapacity: 1500,
      fuelType: 'Diesel',
      requiredLicenseCategory: 'C',
      acquisitionDate: new Date('2022-01-15'),
      region: 'North',
    },
    update: {},
  });

  await prisma.vehicle.upsert({
    where: { licensePlate: 'XYZ-2002' },
    create: {
      licensePlate: 'XYZ-2002',
      make: 'Ford',
      model: 'Transit',
      year: 2021,
      type: 'VAN',
      status: 'AVAILABLE',
      odometer: 32000,
      maxLoadCapacity: 800,
      fuelType: 'Petrol',
      requiredLicenseCategory: 'B',
      acquisitionDate: new Date('2021-06-01'),
      region: 'South',
    },
    update: {},
  });

  // Feature flags
  await prisma.featureFlag.upsert({
    where: { name: 'maintenance_alerts' },
    create: { name: 'maintenance_alerts', enabled: true, description: 'Show overdue maintenance alerts' },
    update: {},
  });

  console.log('Seed completed: admin@fleetguard.com / admin123', { adminId: admin.id, driver1: driver1.id, v1: v1.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
