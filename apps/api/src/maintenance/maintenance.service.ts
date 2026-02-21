import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceRepository } from './maintenance.repository';
import { SystemConfigService } from '../common/system-config.service';
import { NotificationService } from '../common/notification.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private repo: MaintenanceRepository,
    private config: SystemConfigService,
    private notification: NotificationService,
  ) {}

  async create(dto: CreateMaintenanceDto) {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({
        where: { id: dto.vehicleId, deletedAt: null },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');

      const log = await tx.maintenanceLog.create({
        data: {
          vehicleId: dto.vehicleId,
          serviceType: dto.serviceType,
          description: dto.description,
          cost: dto.cost,
          odometer: dto.odometer,
          scheduledDate: new Date(dto.scheduledDate),
          notes: dto.notes,
          status: 'SCHEDULED',
        },
        include: { vehicle: true },
      });

      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: VehicleStatus.IN_SHOP },
      });
      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId: dto.vehicleId,
          fromStatus: vehicle.status,
          toStatus: VehicleStatus.IN_SHOP,
          changedBy: 'system',
          reason: `Maintenance scheduled: ${log.id}`,
        },
      });

      return log;
    });
  }

  async complete(id: string) {
    const log = await this.repo.findById(id);
    if (!log) throw new NotFoundException('Maintenance log not found');
    const vehicleId = (log as any).vehicleId;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceLog.update({
        where: { id },
        data: { status: 'COMPLETED', completedDate: new Date() },
        include: { vehicle: true },
      });
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId,
          fromStatus: VehicleStatus.IN_SHOP,
          toStatus: VehicleStatus.AVAILABLE,
          changedBy: 'system',
          reason: `Maintenance completed: ${id}`,
        },
      });
      return updated;
    });
  }

  async list(filters: MaintenanceFilterDto) {
    return this.repo.findMany(filters);
  }

  async getOverdue() {
    const intervalKm = await this.config.getNumber('maintenanceIntervalKm', 10000);
    return this.repo.getOverdue(intervalKm);
  }
}
