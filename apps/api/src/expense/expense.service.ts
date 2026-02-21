import { Injectable } from '@nestjs/common';
import { ExpenseRepository } from './expense.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';

@Injectable()
export class ExpenseService {
  constructor(private repo: ExpenseRepository) {}

  async create(dto: CreateExpenseDto) {
    return this.repo.create({
      vehicleId: dto.vehicleId,
      tripId: dto.tripId,
      category: dto.category,
      amount: dto.amount,
      date: dto.date ? new Date(dto.date) : undefined,
      notes: dto.notes,
    });
  }

  async list(filters: ExpenseFilterDto) {
    return this.repo.findMany(filters);
  }

  async getMonthlyReport(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.repo.getMonthlyBreakdownPerVehicle(fromDate, toDate);
  }
}
