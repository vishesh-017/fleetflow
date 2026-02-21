import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';

@Injectable()
export class VehicleRepository {
  constructor(private prisma: PrismaService) {}

  async findMany(filters: VehicleFilterDto) {
    const { status, type, region, page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (type) where.type = type;
    if (region) where.region = region;

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { trips: true, maintenanceLogs: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string) {
    return this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: {
        maintenanceLogs: { take: 1, orderBy: { completedDate: 'desc' }, where: { status: 'COMPLETED' } },
        trips: { take: 1, where: { status: 'IN_PROGRESS' }, include: { driver: true } },
        fuelLogs: { take: 10, orderBy: { date: 'desc' } },
      },
    });
  }

  async findAvailable() {
    return this.prisma.vehicle.findMany({
      where: { status: VehicleStatus.AVAILABLE, deletedAt: null },
      orderBy: { licensePlate: 'asc' },
    });
  }

  async findByLicensePlate(licensePlate: string, excludeId?: string) {
    const where: any = { licensePlate: { equals: licensePlate, mode: 'insensitive' }, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.vehicle.findFirst({ where });
  }

  async create(data: any) {
    return this.prisma.vehicle.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.vehicle.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStatusHistory(vehicleId: string, limit = 50) {
    return this.prisma.vehicleStatusHistory.findMany({
      where: { vehicleId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async addStatusHistory(vehicleId: string, fromStatus: VehicleStatus | null, toStatus: VehicleStatus, changedBy: string, reason?: string) {
    return this.prisma.vehicleStatusHistory.create({
      data: { vehicleId, fromStatus, toStatus, changedBy, reason },
    });
  }
}
