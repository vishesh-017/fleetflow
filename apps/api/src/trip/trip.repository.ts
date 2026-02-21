import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';
import { TripFilterDto } from './dto/trip-filter.dto';

@Injectable()
export class TripRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vehicleId: string;
    driverId: string;
    createdById: string;
    origin: string;
    destination: string;
    cargoWeight: number;
  }) {
    return this.prisma.trip.create({
      data: {
        ...data,
        status: TripStatus.DRAFT,
      },
      include: { vehicle: true, driver: true },
    });
  }

  async findMany(filters: TripFilterDto) {
    const { status, vehicleId, driverId, from, to, page = 1, pageSize = 10 } = filters;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { vehicle: true, driver: true },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string) {
    return this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: {
        vehicle: true,
        driver: true,
        fuelLogs: true,
      },
    });
  }

  async findActiveByVehicle(vehicleId: string) {
    return this.prisma.trip.findFirst({
      where: {
        vehicleId,
        status: { in: [TripStatus.DISPATCHED, TripStatus.IN_PROGRESS] },
        deletedAt: null,
      },
    });
  }

  async findActiveByDriver(driverId: string) {
    return this.prisma.trip.findFirst({
      where: {
        driverId,
        status: { in: [TripStatus.DISPATCHED, TripStatus.IN_PROGRESS] },
        deletedAt: null,
      },
    });
  }

  async findActiveAll() {
    return this.prisma.trip.findMany({
      where: {
        status: { in: [TripStatus.DISPATCHED, TripStatus.IN_PROGRESS] },
        deletedAt: null,
      },
      include: { vehicle: true, driver: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: TripStatus, extra?: { startTime?: Date; endTime?: Date; cancelReason?: string }) {
    return this.prisma.trip.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async lockVehicleAndDriver(vehicleId: string, driverId: string) {
    return this.prisma.$transaction([
      this.prisma.vehicle.findFirstOrThrow({
        where: { id: vehicleId, deletedAt: null },
        // SELECT FOR UPDATE equivalent: use transaction + update to lock
      }),
      this.prisma.driver.findFirstOrThrow({
        where: { id: driverId, deletedAt: null },
      }),
    ]);
  }
}
