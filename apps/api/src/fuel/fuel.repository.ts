import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FuelRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vehicleId: string;
    tripId?: string;
    liters: number;
    cost: number;
    station: string;
    date?: Date;
    efficiency?: number;
    isAnomaly?: boolean;
  }) {
    return this.prisma.fuelLog.create({
      data: { ...data, date: data.date ?? new Date() },
      include: { vehicle: true, trip: true },
    });
  }

  async findByVehicle(vehicleId: string, limit = 50) {
    return this.prisma.fuelLog.findMany({
      where: { vehicleId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: limit,
      include: { trip: true },
    });
  }

  async findAnomalies() {
    return this.prisma.fuelLog.findMany({
      where: { isAnomaly: true, deletedAt: null },
      orderBy: { date: 'desc' },
      include: { vehicle: true },
    });
  }

  async getFleetEfficiencyStats(from?: Date, to?: Date) {
    const where: any = { deletedAt: null };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    const logs = await this.prisma.fuelLog.findMany({
      where,
      select: { efficiency: true, liters: true, cost: true },
    });
    const withEff = logs.filter((l) => l.efficiency != null && l.efficiency > 0);
    const avgEfficiency =
      withEff.length > 0 ? withEff.reduce((s, l) => s + (l.efficiency ?? 0), 0) / withEff.length : null;
    const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
    const totalCost = logs.reduce((s, l) => s + l.cost, 0);
    return { avgEfficiency, totalLiters, totalCost, count: logs.length };
  }

  async getVehicleAvgEfficiency(vehicleId: string): Promise<number> {
    const agg = await this.prisma.fuelLog.aggregate({
      where: { vehicleId, deletedAt: null, efficiency: { not: null } },
      _avg: { efficiency: true },
      _count: { efficiency: true },
    });
    return agg._avg.efficiency ?? 0;
  }

  async getTripDistanceKm(tripId: string): Promise<number | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { distanceKm: true },
    });
    return trip?.distanceKm ?? null;
  }
}
