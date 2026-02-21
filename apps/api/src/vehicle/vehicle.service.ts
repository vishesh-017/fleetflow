import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { VehicleRepository } from './vehicle.repository';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';

@Injectable()
export class VehicleService {
  constructor(private repo: VehicleRepository) {}

  async list(filters: VehicleFilterDto) {
    return this.repo.findMany(filters);
  }

  async getById(id: string) {
    const v = await this.repo.findById(id);
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async getAvailable() {
    return this.repo.findAvailable();
  }

  async create(dto: CreateVehicleDto, userId: string) {
    const normalizedPlate = dto.licensePlate.trim();
    const existing = await this.repo.findByLicensePlate(normalizedPlate);
    if (existing) throw new ConflictException('License plate already in use');

    const status = dto.status === VehicleStatus.AVAILABLE || !dto.status ? VehicleStatus.AVAILABLE : dto.status;
    if (status !== VehicleStatus.AVAILABLE) throw new BadRequestException('New vehicles must be created as AVAILABLE');

    const data = {
      licensePlate: normalizedPlate.toUpperCase(),
      make: dto.make,
      model: dto.model,
      year: dto.year,
      type: dto.type,
      status: VehicleStatus.AVAILABLE,
      odometer: dto.odometer ?? 0,
      maxLoadCapacity: dto.maxLoadCapacity,
      fuelType: dto.fuelType,
      requiredLicenseCategory: dto.requiredLicenseCategory,
      acquisitionDate: new Date(dto.acquisitionDate),
      region: dto.region ?? null,
    };

    const vehicle = await this.repo.create(data);
    await this.repo.addStatusHistory(vehicle.id, null, VehicleStatus.AVAILABLE, userId, 'Initial creation');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto, userId: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Vehicle not found');

    if (dto.licensePlate !== undefined) {
      const normalized = dto.licensePlate.trim();
      const duplicate = await this.repo.findByLicensePlate(normalized, id);
      if (duplicate) throw new ConflictException('License plate already in use');
    }

    if (dto.odometer !== undefined) {
      const current = (existing as any).odometer ?? 0;
      if (dto.odometer < current) throw new BadRequestException('Odometer cannot decrease');
    }

    // Do not allow direct status change via update (status changes via trip/maintenance/retire only)
    const { status, ...rest } = dto as any;
    const data = { ...rest };
    if (data.licensePlate) data.licensePlate = data.licensePlate.toUpperCase();
    if (data.acquisitionDate) data.acquisitionDate = new Date(data.acquisitionDate);

    return this.repo.update(id, data);
  }

  async retire(id: string, userId: string, reason: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Vehicle not found');
    const currentStatus = (existing as any).status;
    if (currentStatus === VehicleStatus.RETIRED) throw new BadRequestException('Vehicle is already retired');
    await this.repo.addStatusHistory(id, currentStatus, VehicleStatus.RETIRED, userId, reason || 'Retired by admin');
    return this.repo.update(id, { status: VehicleStatus.RETIRED });
  }

  async remove(id: string, userId: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Vehicle not found');
    const status = (existing as any).status;
    if (status !== VehicleStatus.AVAILABLE) throw new ForbiddenException('Only AVAILABLE vehicles can be soft-deleted');
    return this.repo.softDelete(id);
  }

  async getStatusHistory(id: string) {
    const v = await this.repo.findById(id);
    if (!v) throw new NotFoundException('Vehicle not found');
    return this.repo.getStatusHistory(id);
  }

  async getStats(id: string) {
    const v = await this.repo.findById(id);
    if (!v) throw new NotFoundException('Vehicle not found');
    // Placeholder: ROI, cost per km, utilization % - can be implemented with raw queries / aggregations
    const vehicle = v as any;
    return {
      vehicleId: id,
      licensePlate: vehicle.licensePlate,
      status: vehicle.status,
      odometer: vehicle.odometer,
      totalTrips: vehicle.trips?.length ?? 0,
      roi: null as number | null,
      costPerKm: null as number | null,
      utilizationPercent: null as number | null,
    };
  }
}
