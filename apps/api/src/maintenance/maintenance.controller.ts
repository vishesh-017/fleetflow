import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create maintenance log (sets vehicle IN_SHOP)' })
  create(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(dto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark maintenance done, set vehicle AVAILABLE' })
  complete(@Param('id') id: string) {
    return this.maintenanceService.complete(id);
  }

  @Get()
  @ApiOperation({ summary: 'List maintenance logs with filters' })
  list(@Query() filters: MaintenanceFilterDto) {
    return this.maintenanceService.list(filters);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Vehicles past maintenance interval' })
  getOverdue() {
    return this.maintenanceService.getOverdue();
  }
}
