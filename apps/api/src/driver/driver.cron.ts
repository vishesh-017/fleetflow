import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DriverRepository } from './driver.repository';
import { NotificationService } from '../common/notification.service';

@Injectable()
export class DriverCronService {
  constructor(
    private repo: DriverRepository,
    private notification: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiringLicenses() {
    const drivers = await this.repo.findExpiringLicenses(30);
    for (const d of drivers) {
      await this.notification.create(
        'license_expiry',
        'warning',
        `Driver ${d.name} (${d.licenseNumber}) license expires on ${d.licenseExpiryDate.toISOString().slice(0, 10)}`,
        d.id,
        'driver',
      );
    }
  }
}
