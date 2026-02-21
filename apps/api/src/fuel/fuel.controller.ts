import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FuelService } from './fuel.service';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';

@ApiTags('fuel')
@Controller('fuel')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Post()
  @ApiOperation({ summary: 'Log fuel entry (trip or standalone)' })
  create(@Body() dto: CreateFuelLogDto) {
    return this.fuelService.create(dto);
  }

  @Get('vehicle/:id')
  @ApiOperation({ summary: 'Fuel history for vehicle' })
  getByVehicle(@Param('id') id: string) {
    return this.fuelService.getByVehicle(id);
  }

  @Get('anomalies')
  @Roles(UserRole.FINANCE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Flagged fuel anomalies' })
  getAnomalies() {
    return this.fuelService.getAnomalies();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Fleet-wide efficiency stats' })
  getStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.fuelService.getStats(from, to);
  }
}
