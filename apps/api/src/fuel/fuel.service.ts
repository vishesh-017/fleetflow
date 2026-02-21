import { Injectable } from '@nestjs/common';
import { FuelRepository } from './fuel.repository';
import { NotificationService } from '../common/notification.service';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';

@Injectable()
export class FuelService {
  constructor(
    private repo: FuelRepository,
    private notification: NotificationService,
  ) {}

  async create(dto: CreateFuelLogDto) {
    let efficiency: number | undefined;
    if (dto.tripId && dto.liters > 0) {
      const distanceKm = await this.repo.getTripDistanceKm(dto.tripId);
      if (distanceKm != null && distanceKm > 0) {
        efficiency = distanceKm / dto.liters;
      }
    }

    const vehicleAvg = await this.repo.getVehicleAvgEfficiency(dto.vehicleId);
    const isAnomaly =
      efficiency != null &&
      vehicleAvg > 0 &&
      efficiency < vehicleAvg * 0.7;

    if (isAnomaly) {
      await this.notification.create(
        'fuel_anomaly',
        'warning',
        `Fuel efficiency anomaly detected for vehicle ${dto.vehicleId}`,
        dto.vehicleId,
        'vehicle',
      );
    }

    return this.repo.create({
      vehicleId: dto.vehicleId,
      tripId: dto.tripId,
      liters: dto.liters,
      cost: dto.cost,
      station: dto.station,
      date: dto.date ? new Date(dto.date) : undefined,
      efficiency,
      isAnomaly: isAnomaly ?? false,
    });
  }

  async getByVehicle(vehicleId: string) {
    return this.repo.findByVehicle(vehicleId);
  }

  async getAnomalies() {
    return this.repo.findAnomalies();
  }

  async getStats(from?: string, to?: string) {
    return this.repo.getFleetEfficiencyStats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
