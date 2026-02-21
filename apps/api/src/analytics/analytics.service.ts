import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getFleetUtilization(from: string, to: string, vehicleType?: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const where: any = { deletedAt: null, status: 'COMPLETED', createdAt: { gte: fromDate, lte: toDate } };
    const trips = await this.prisma.trip.findMany({
      where,
      select: { vehicleId: true, vehicle: { select: { type: true } } },
    });
    const byType = vehicleType ? trips.filter((t) => (t.vehicle as any).type === vehicleType) : trips;
    const totalVehicles = await this.prisma.vehicle.count({
      where: { deletedAt: null, ...(vehicleType ? { type: vehicleType } : {}) },
    });
    const uniqueVehicles = new Set(byType.map((t) => t.vehicleId)).size;
    const utilization = totalVehicles > 0 ? (uniqueVehicles / totalVehicles) * 100 : 0;
    return { from, to, vehicleType, totalVehicles, utilizedVehicles: uniqueVehicles, utilizationPercent: utilization };
  }

  async getFuelEfficiency(vehicleId: string, from?: string, to?: string) {
    const where: any = { vehicleId, deletedAt: null };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const agg = await this.prisma.fuelLog.aggregate({
      where: { ...where, efficiency: { not: null } },
      _avg: { efficiency: true },
      _count: { efficiency: true },
    });
    return { vehicleId, avgEfficiency: agg._avg.efficiency, dataPoints: agg._count.efficiency };
  }

  async getCostPerKm(vehicleId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const [trips, expenses] = await Promise.all([
      this.prisma.trip.findMany({
        where: { vehicleId, status: 'COMPLETED', deletedAt: null, endTime: { gte: fromDate, lte: toDate } },
        select: { distanceKm: true },
      }),
      this.prisma.expense.findMany({
        where: { vehicleId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
        select: { amount: true },
      }),
    ]);
    const totalKm = trips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);
    const totalCost = expenses.reduce((s, e) => s + e.amount, 0);
    const costPerKm = totalKm > 0 ? totalCost / totalKm : null;
    return { vehicleId, from, to, totalKm, totalCost, costPerKm };
  }

  async getVehicleRoi(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
      select: { acquisitionDate: true, id: true },
    });
    if (!vehicle) return { vehicleId, roi: null };
    const expenses = await this.prisma.expense.aggregate({
      where: { vehicleId, deletedAt: null },
      _sum: { amount: true },
    });
    const totalCost = expenses._sum.amount ?? 0;
    return { vehicleId, totalCost, roi: null };
  }

  async getExpenseBreakdown(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const expenses = await this.prisma.expense.findMany({
      where: { deletedAt: null, date: { gte: fromDate, lte: toDate } },
      select: { category: true, amount: true },
    });
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }
    return { from, to, breakdown: byCategory };
  }

  async getDriverPerformance(driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      include: { violations: { where: { deletedAt: null } }, trips: { where: { status: 'COMPLETED' } } },
    });
    if (!driver) return null;
    const completed = driver.trips.length;
    return {
      driverId,
      name: driver.name,
      safetyScore: driver.safetyScore,
      completedTrips: completed,
      violationsCount: driver.violations.length,
    };
  }

  async exportReport(type: 'csv' | 'pdf', report: string, from: string, to: string) {
    if (type === 'csv') {
      if (report === 'fuel') {
        const logs = await this.prisma.fuelLog.findMany({
          where: { deletedAt: null, date: { gte: new Date(from), lte: new Date(to) } },
          include: { vehicle: true },
        });
        const rows = logs.map((l) => ({
          date: l.date.toISOString(),
          vehicleId: l.vehicleId,
          licensePlate: (l.vehicle as any).licensePlate,
          liters: l.liters,
          cost: l.cost,
          efficiency: l.efficiency,
        }));
        return { format: 'csv', data: rows };
      }
      if (report === 'expenses') {
        const expenses = await this.prisma.expense.findMany({
          where: { deletedAt: null, date: { gte: new Date(from), lte: new Date(to) } },
          include: { vehicle: true },
        });
        const rows = expenses.map((e) => ({
          date: e.date.toISOString(),
          vehicleId: e.vehicleId,
          category: e.category,
          amount: e.amount,
        }));
        return { format: 'csv', data: rows };
      }
      if (report === 'utilization') {
        const u = await this.getFleetUtilization(from, to);
        return { format: 'csv', data: [u] };
      }
    }
    if (type === 'pdf') {
      return { format: 'pdf', message: 'PDF export requires pdfkit; returning placeholder' };
    }
    return { format: type, data: null };
  }
}
