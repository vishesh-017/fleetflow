import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseFilterDto } from './dto/expense-filter.dto';

@Injectable()
export class ExpenseRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vehicleId: string;
    tripId?: string;
    category: any;
    amount: number;
    date?: Date;
    notes?: string;
  }) {
    return this.prisma.expense.create({
      data: { ...data, date: data.date ?? new Date() },
      include: { vehicle: true, trip: true },
    });
  }

  async findMany(filters: ExpenseFilterDto) {
    const { vehicleId, category, from, to, page = 1, pageSize = 10 } = filters;
    const where: any = { deletedAt: null };
    if (vehicleId) where.vehicleId = vehicleId;
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: { vehicle: true, trip: true },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMonthlyBreakdownPerVehicle(from: Date, to: Date) {
    const expenses = await this.prisma.expense.findMany({
      where: { deletedAt: null, date: { gte: from, lte: to } },
      select: {
        vehicleId: true,
        vehicle: { select: { licensePlate: true } },
        category: true,
        amount: true,
        date: true,
      },
    });
    const byVehicle: Record<string, { vehicleId: string; licensePlate: string; byMonth: Record<string, Record<string, number> } }> = {};
    for (const e of expenses) {
      const key = e.vehicleId;
      if (!byVehicle[key]) {
        byVehicle[key] = {
          vehicleId: e.vehicleId,
          licensePlate: (e.vehicle as any).licensePlate,
          byMonth: {},
        };
      }
      const monthKey = e.date.toISOString().slice(0, 7);
      if (!byVehicle[key].byMonth[monthKey]) byVehicle[key].byMonth[monthKey] = {};
      const cat = e.category;
      byVehicle[key].byMonth[monthKey][cat] = (byVehicle[key].byMonth[monthKey][cat] ?? 0) + e.amount;
    }
    return Object.values(byVehicle);
  }
}
