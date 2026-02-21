import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TripStatus, VehicleStatus, DriverStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TripRepository } from './trip.repository';
import { AuditLogService } from '../auth/services/audit-log.service';
import { transitionTripStatus } from './trip-state-machine';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripFilterDto } from './dto/trip-filter.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';

@Injectable()
export class TripService {
  constructor(
    private prisma: PrismaService,
    private repo: TripRepository,
    private auditLog: AuditLogService,
  ) {}

  async create(dto: CreateTripDto, userId: string, ip: string, userAgent: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({
        where: { id: dto.vehicleId, deletedAt: null },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      if (vehicle.status !== VehicleStatus.AVAILABLE) {
        throw new BadRequestException('Vehicle is not available for dispatch');
      }
      if (vehicle.status === VehicleStatus.RETIRED) {
        throw new BadRequestException('Retired vehicles cannot be assigned to trips');
      }

      const driver = await tx.driver.findFirst({
        where: { id: dto.driverId, deletedAt: null },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      if (driver.status !== DriverStatus.ON_DUTY) {
        throw new BadRequestException('Driver must be ON_DUTY to be assigned');
      }
      if (new Date(driver.licenseExpiryDate) <= today) {
        throw new BadRequestException('Driver license has expired');
      }
      if (driver.licenseCategory !== vehicle.requiredLicenseCategory) {
        throw new BadRequestException(
          `Driver license category ${driver.licenseCategory} does not match vehicle required ${vehicle.requiredLicenseCategory}`,
        );
      }

      if (dto.cargoWeight > vehicle.maxLoadCapacity) {
        throw new BadRequestException(
          `Cargo weight ${dto.cargoWeight} exceeds vehicle max capacity ${vehicle.maxLoadCapacity}`,
        );
      }

      const activeTripVehicle = await tx.trip.findFirst({
        where: {
          vehicleId: dto.vehicleId,
          status: { in: [TripStatus.DISPATCHED, TripStatus.IN_PROGRESS] },
          deletedAt: null,
        },
      });
      if (activeTripVehicle) throw new ConflictException('Vehicle already has an active trip');

      const activeTripDriver = await tx.trip.findFirst({
        where: {
          driverId: dto.driverId,
          status: { in: [TripStatus.DISPATCHED, TripStatus.IN_PROGRESS] },
          deletedAt: null,
        },
      });
      if (activeTripDriver) throw new ConflictException('Driver already has an active trip');

      const trip = await tx.trip.create({
        data: {
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          createdById: userId,
          origin: dto.origin,
          destination: dto.destination,
          cargoWeight: dto.cargoWeight,
          status: TripStatus.DRAFT,
        },
        include: { vehicle: true, driver: true },
      });

      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: VehicleStatus.ON_TRIP },
      });
      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId: dto.vehicleId,
          fromStatus: VehicleStatus.AVAILABLE,
          toStatus: VehicleStatus.ON_TRIP,
          changedBy: userId,
          reason: `Trip created: ${trip.id}`,
        },
      });

      await tx.driver.update({
        where: { id: dto.driverId },
        data: { status: DriverStatus.ON_TRIP },
      });

      await this.auditLog.log('TRIP_CREATED', userId, ip, userAgent, {
        tripId: trip.id,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
      });

      return trip;
    });
  }

  async list(filters: TripFilterDto) {
    return this.repo.findMany(filters);
  }

  async getById(id: string) {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Trip not found');
    return t;
  }

  async getActive() {
    return this.repo.findActiveAll();
  }

  async dispatch(id: string) {
    const trip = await this.repo.findById(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const newStatus = transitionTripStatus((trip as any).status, 'DISPATCH');
    return this.repo.updateStatus(id, newStatus);
  }

  async start(id: string) {
    const trip = await this.repo.findById(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const newStatus = transitionTripStatus((trip as any).status, 'START');
    return this.repo.updateStatus(id, newStatus, { startTime: new Date() });
  }

  async complete(id: string) {
    const trip = await this.repo.findById(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const t = trip as any;
    transitionTripStatus(t.status, 'COMPLETE');

    return this.prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id },
        data: { status: TripStatus.COMPLETED, endTime: new Date() },
      });
      await tx.vehicle.update({
        where: { id: t.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId: t.vehicleId,
          fromStatus: VehicleStatus.ON_TRIP,
          toStatus: VehicleStatus.AVAILABLE,
          changedBy: 'system',
          reason: `Trip completed: ${id}`,
        },
      });
      await tx.driver.update({
        where: { id: t.driverId },
        data: { status: DriverStatus.ON_DUTY },
      });
      return this.repo.findById(id);
    });
  }

  async cancel(id: string, dto: CancelTripDto) {
    const trip = await this.repo.findById(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const t = trip as any;
    const newStatus = transitionTripStatus(t.status, 'CANCEL');

    const updates: Promise<any>[] = [
      this.repo.updateStatus(id, newStatus, { cancelReason: dto.reason }),
    ];
    // Release vehicle and driver for any status that had them reserved (DRAFT, DISPATCHED, IN_PROGRESS)
    if (
      t.status === TripStatus.DRAFT ||
      t.status === TripStatus.DISPATCHED ||
      t.status === TripStatus.IN_PROGRESS
    ) {
      updates.push(
        this.prisma.vehicle.update({
          where: { id: t.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        }) as any,
      );
      updates.push(
        this.prisma.driver.update({
          where: { id: t.driverId },
          data: { status: DriverStatus.ON_DUTY },
        }) as any,
      );
    }
    await Promise.all(updates);
    return this.repo.findById(id);
  }
}
