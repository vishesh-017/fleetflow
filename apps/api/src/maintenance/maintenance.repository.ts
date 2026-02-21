import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';

@Injectable()
export class MaintenanceRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vehicleId: string;
    serviceType: string;
    description: string;
    cost: number;
    odometer: number;
    scheduledDate: Date;
    notes?: string;
  }) {
    return this.prisma.maintenanceLog.create({
      data: { ...data, status: 'SCHEDULED' },
      include: { vehicle: true },
    });
  }

  async findMany(filters: MaintenanceFilterDto) {
    const { vehicleId, status, page = 1, pageSize = 10 } = filters;
    const where: any = { deletedAt: null };
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.maintenanceLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { scheduledDate: 'desc' },
        include: { vehicle: true },
      }),
      this.prisma.maintenanceLog.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string) {
    return this.prisma.maintenanceLog.findFirst({
      where: { id, deletedAt: null },
      include: { vehicle: true },
    });
  }

  async complete(id: string, completedDate: Date) {
    return this.prisma.maintenanceLog.update({
      where: { id },
      data: { status: 'COMPLETED', completedDate },
      include: { vehicle: true },
    });
  }

  async getOverdue(intervalKm: number) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { deletedAt: null, status: { not: 'RETIRED' } },
      include: {
        maintenanceLogs: {
          where: { status: 'COMPLETED' },
          orderBy: { completedDate: 'desc' },
          take: 1,
        },
      },
    });
    const overdue: any[] = [];
    for (const v of vehicles) {
      const last = v.maintenanceLogs[0];
      const lastOdometer = last?.odometer ?? 0;
      if (v.odometer - lastOdometer > intervalKm) {
        overdue.push({
          vehicleId: v.id,
          licensePlate: v.licensePlate,
          currentOdometer: v.odometer,
          lastServiceOdometer: lastOdometer,
          kmSinceService: v.odometer - lastOdometer,
          intervalKm,
        });
      }
    }
    return overdue;
  }
}
