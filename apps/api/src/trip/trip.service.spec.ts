import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TripStatus, VehicleStatus, DriverStatus } from '@prisma/client';
import { TripService } from './trip.service';
import { PrismaService } from '../prisma/prisma.service';
import { TripRepository } from './trip.repository';
import { AuditLogService } from '../auth/services/audit-log.service';
import { transitionTripStatus } from './trip-state-machine';

describe('TripStateMachine', () => {
  it('DRAFT -> DISPATCH -> DISPATCHED', () => {
    expect(transitionTripStatus(TripStatus.DRAFT, 'DISPATCH')).toBe(TripStatus.DISPATCHED);
  });
  it('DISPATCHED -> START -> IN_PROGRESS', () => {
    expect(transitionTripStatus(TripStatus.DISPATCHED, 'START')).toBe(TripStatus.IN_PROGRESS);
  });
  it('IN_PROGRESS -> COMPLETE -> COMPLETED', () => {
    expect(transitionTripStatus(TripStatus.IN_PROGRESS, 'COMPLETE')).toBe(TripStatus.COMPLETED);
  });
  it('DRAFT -> CANCEL -> CANCELLED', () => {
    expect(transitionTripStatus(TripStatus.DRAFT, 'CANCEL')).toBe(TripStatus.CANCELLED);
  });
  it('DISPATCHED -> CANCEL -> CANCELLED', () => {
    expect(transitionTripStatus(TripStatus.DISPATCHED, 'CANCEL')).toBe(TripStatus.CANCELLED);
  });
  it('IN_PROGRESS -> CANCEL throws', () => {
    expect(() => transitionTripStatus(TripStatus.IN_PROGRESS, 'CANCEL')).toThrow();
  });
  it('COMPLETED -> START throws', () => {
    expect(() => transitionTripStatus(TripStatus.COMPLETED, 'START')).toThrow();
  });
});

const mockPrisma = {
  $transaction: jest.fn((fn) => (typeof fn === 'function' ? fn(mockTx) : fn)),
  vehicle: { findFirst: jest.fn(), update: jest.fn(), statusHistory: { create: jest.fn() } },
  driver: { findFirst: jest.fn(), update: jest.fn() },
  trip: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  vehicleStatusHistory: { create: jest.fn() },
};

const mockTx = {
  vehicle: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  driver: { findFirst: jest.fn(), update: jest.fn() },
  trip: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  vehicleStatusHistory: { create: jest.fn() },
};

describe('TripService', () => {
  let service: TripService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: TripRepository,
          useValue: {
            findById: jest.fn(),
            updateStatus: jest.fn(),
            findActiveAll: jest.fn(),
          },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<TripService>(TripService);
  });

  it('create should reject overweight cargo', async () => {
    mockTx.vehicle.findFirst.mockResolvedValue({
      id: 'v1',
      status: VehicleStatus.AVAILABLE,
      maxLoadCapacity: 100,
      requiredLicenseCategory: 'C',
    });
    mockTx.driver.findFirst.mockResolvedValue({
      id: 'd1',
      status: DriverStatus.ON_DUTY,
      licenseExpiryDate: new Date(Date.now() + 86400000),
      licenseCategory: 'C',
    });
    mockTx.trip.findFirst.mockResolvedValue(null);
    mockTx.trip.create.mockResolvedValue({ id: 't1', vehicleId: 'v1', driverId: 'd1' });
    mockTx.vehicle.update.mockResolvedValue({});
    mockTx.driver.update.mockResolvedValue({});
    mockTx.vehicleStatusHistory.create.mockResolvedValue({});

    await expect(
      service.create(
        {
          vehicleId: 'v1',
          driverId: 'd1',
          origin: 'A',
          destination: 'B',
          cargoWeight: 150,
        },
        'user-1',
        '',
        '',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('create should reject license mismatch', async () => {
    mockTx.vehicle.findFirst.mockResolvedValue({
      id: 'v1',
      status: VehicleStatus.AVAILABLE,
      maxLoadCapacity: 1000,
      requiredLicenseCategory: 'C',
    });
    mockTx.driver.findFirst.mockResolvedValue({
      id: 'd1',
      status: DriverStatus.ON_DUTY,
      licenseExpiryDate: new Date(Date.now() + 86400000),
      licenseCategory: 'B',
    });

    await expect(
      service.create(
        {
          vehicleId: 'v1',
          driverId: 'd1',
          origin: 'A',
          destination: 'B',
          cargoWeight: 100,
        },
        'user-1',
        '',
        '',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('create should reject when driver already has active trip', async () => {
    mockTx.vehicle.findFirst.mockResolvedValue({
      id: 'v1',
      status: VehicleStatus.AVAILABLE,
      maxLoadCapacity: 1000,
      requiredLicenseCategory: 'C',
    });
    mockTx.driver.findFirst.mockResolvedValue({
      id: 'd1',
      status: DriverStatus.ON_DUTY,
      licenseExpiryDate: new Date(Date.now() + 86400000),
      licenseCategory: 'C',
    });
    mockTx.trip.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' });

    await expect(
      service.create(
        {
          vehicleId: 'v1',
          driverId: 'd1',
          origin: 'A',
          destination: 'B',
          cargoWeight: 100,
        },
        'user-1',
        '',
        '',
      ),
    ).rejects.toThrow(ConflictException);
  });
});
