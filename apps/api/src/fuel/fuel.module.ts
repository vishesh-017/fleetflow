import { Module } from '@nestjs/common';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';
import { FuelRepository } from './fuel.repository';

@Module({
  controllers: [FuelController],
  providers: [FuelService, FuelRepository],
  exports: [FuelService],
})
export class FuelModule {}
