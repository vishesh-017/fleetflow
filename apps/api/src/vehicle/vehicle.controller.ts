import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicles with filters and pagination' })
  list(@Query() filters: VehicleFilterDto) {
    return this.vehicleService.list(filters);
  }

  @Get('available')
  @ApiOperation({ summary: 'List only AVAILABLE vehicles (e.g. for dispatcher dropdown)' })
  getAvailable() {
    return this.vehicleService.getAvailable();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle detail with last maintenance, active trip, fuel stats' })
  getById(@Param('id') id: string) {
    return this.vehicleService.getById(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get vehicle status change history' })
  getHistory(@Param('id') id: string) {
    return this.vehicleService.getStatusHistory(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get vehicle stats: ROI, cost per km, utilization %' })
  getStats(@Param('id') id: string) {
    return this.vehicleService.getStats(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create vehicle' })
  create(@Body() dto: CreateVehicleDto, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? '';
    return this.vehicleService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle (not status directly)' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? '';
    return this.vehicleService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete vehicle (only if AVAILABLE)' })
  remove(@Param('id') id: string) {
    return this.vehicleService.remove(id, '');
  }
}
