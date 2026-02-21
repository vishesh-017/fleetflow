import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus } from '@prisma/client';

@Injectable()
export class DriverRepository {
  constructor(private prisma: PrismaService) {}

  async findMany(filters: { page?: number; pageSize?: number; status?: DriverStatus }) {
    const { page = 1, pageSize = 10, status } = filters;
    const where: any = { deletedAt: null };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string) {
    return this.prisma.driver.findFirst({
      where: { id, deletedAt: null },
      include: {
        violations: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        trips: { take: 10, orderBy: { createdAt: 'desc' }, where: { deletedAt: null } },
      },
    });
  }

  async create(data: any) {
    return this.prisma.driver.create({
      data: { ...data, status: DriverStatus.OFF_DUTY, safetyScore: 100, baseScore: 100 },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.driver.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addViolation(
    driverId: string,
    data: { type: string; severity: any; date?: Date; tripId?: string; notes?: string },
    recordedBy: string,
  ) {
    return this.prisma.violationRecord.create({
      data: { ...data, driverId, recordedBy, date: data.date ?? new Date() },
      include: { driver: true },
    });
  }

  async findExpiringLicenses(withinDays: number) {
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    return this.prisma.driver.findMany({
      where: {
        deletedAt: null,
        licenseExpiryDate: { lte: limit, gte: new Date() },
      },
      orderBy: { licenseExpiryDate: 'asc' },
    });
  }

  async getCompletedTripsCount(driverId: string): Promise<number> {
    const r = await this.prisma.trip.count({
      where: { driverId, status: 'COMPLETED', deletedAt: null },
    });
    return r;
  }
}
