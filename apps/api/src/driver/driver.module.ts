import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { DriverRepository } from './driver.repository';
import { DriverCronService } from './driver.cron';

@Module({
  controllers: [DriverController],
  providers: [DriverService, DriverRepository, DriverCronService],
  exports: [DriverService],
})
export class DriverModule {}
