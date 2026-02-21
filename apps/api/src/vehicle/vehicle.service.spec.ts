import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { VehicleService } from './vehicle.service';
import { VehicleRepository } from './vehicle.repository';

const mockRepo = {
  findMany: jest.fn(),
  findById: jest.fn(),
  findAvailable: jest.fn(),
  findByLicensePlate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  getStatusHistory: jest.fn(),
  addStatusHistory: jest.fn(),
};

describe('VehicleService', () => {
  let service: VehicleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: VehicleRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get<VehicleService>(VehicleService);
  });

  describe('create', () => {
    it('should reject duplicate license plate', async () => {
      mockRepo.findByLicensePlate.mockResolvedValue({ id: 'v1' });
      await expect(
        service.create(
          {
            licensePlate: 'ABC 123',
            make: 'Toyota',
            model: 'Hilux',
            year: 2020,
            maxLoadCapacity: 1000,
            fuelType: 'Diesel',
            requiredLicenseCategory: 'C',
            acquisitionDate: '2020-01-01',
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject non-AVAILABLE status on create', async () => {
      mockRepo.findByLicensePlate.mockResolvedValue(null);
      await expect(
        service.create(
          {
            licensePlate: 'XYZ',
            make: 'M',
            model: 'M',
            year: 2020,
            status: VehicleStatus.RETIRED,
            maxLoadCapacity: 100,
            fuelType: 'Diesel',
            requiredLicenseCategory: 'B',
            acquisitionDate: '2020-01-01',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should reject decreasing odometer', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'v1', odometer: 50000 });
      await expect(
        service.update('v1', { odometer: 40000 } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should allow soft delete only when AVAILABLE', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'v1', status: VehicleStatus.AVAILABLE });
      mockRepo.softDelete.mockResolvedValue({});
      await service.remove('v1', 'user-1');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('v1');
    });

    it('should reject soft delete when vehicle is ON_TRIP', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'v1', status: VehicleStatus.ON_TRIP });
      await expect(service.remove('v1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('retire', () => {
    it('should reject retiring already retired vehicle', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'v1', status: VehicleStatus.RETIRED });
      await expect(service.retire('v1', 'user-1', 'reason')).rejects.toThrow(BadRequestException);
    });
  });
});
