import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DriverStatus } from '@prisma/client';
import { DriverRepository } from './driver.repository';
import { SystemConfigService } from '../common/system-config.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { CreateViolationDto } from './dto/create-violation.dto';
import { DriverStatusDto } from './dto/driver-status.dto';

@Injectable()
export class DriverService {
  constructor(
    private repo: DriverRepository,
    private config: SystemConfigService,
  ) {}

  async list(filters: { page?: number; pageSize?: number; status?: DriverStatus }) {
    return this.repo.findMany(filters);
  }

  async getById(id: string) {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException('Driver not found');
    return d;
  }

  async getPerformance(id: string) {
    const driver = await this.repo.findById(id);
    if (!driver) throw new NotFoundException('Driver not found');
    const completedTrips = await this.repo.getCompletedTripsCount(id);
    const penaltyWeight = await this.config.getNumber('violationPenaltyWeight', 5);
    const violations = (driver as any).violations ?? [];
    const deduction = violations.length * penaltyWeight;
    const bonus = completedTrips * 0.1;
    const safetyScore = Math.max(0, 100 - deduction + bonus);
    return {
      driver: { id: driver.id, name: (driver as any).name, safetyScore, completedTrips },
      violations,
      tripStats: { completed: completedTrips },
    };
  }

  async create(dto: CreateDriverDto) {
    const licenseExpiry = new Date(dto.licenseExpiryDate);
    const status = licenseExpiry <= new Date() ? DriverStatus.SUSPENDED : DriverStatus.OFF_DUTY;
    return this.repo.create({
      ...dto,
      licenseExpiryDate: licenseExpiry,
      status,
    });
  }

  async update(id: string, dto: UpdateDriverDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Driver not found');
    if (dto.licenseExpiryDate) {
      const exp = new Date(dto.licenseExpiryDate);
      if (exp <= new Date()) {
        dto.status = DriverStatus.SUSPENDED as any;
      }
    }
    return this.repo.update(id, dto);
  }

  async addViolation(driverId: string, dto: CreateViolationDto, recordedBy: string) {
    const driver = await this.repo.findById(driverId);
    if (!driver) throw new NotFoundException('Driver not found');
    return this.repo.addViolation(
      driverId,
      {
        type: dto.type,
        severity: dto.severity,
        date: dto.date ? new Date(dto.date) : undefined,
        tripId: dto.tripId,
        notes: dto.notes,
      },
      recordedBy,
    );
  }

  async setStatus(driverId: string, dto: DriverStatusDto) {
    const driver = await this.repo.findById(driverId);
    if (!driver) throw new NotFoundException('Driver not found');
    return this.repo.update(driverId, { status: dto.status });
  }

  async getExpiringLicenses(withinDays = 30) {
    return this.repo.findExpiringLicenses(withinDays);
  }

  async remove(id: string) {
    const driver = await this.repo.findById(id);
    if (!driver) throw new NotFoundException('Driver not found');
    return this.repo.softDelete(id);
  }
}
