import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('fleet-utilization')
  @ApiOperation({ summary: 'Fleet utilization %' })
  getFleetUtilization(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('vehicleType') vehicleType?: string,
  ) {
    return this.analyticsService.getFleetUtilization(from, to, vehicleType);
  }

  @Get('fuel-efficiency')
  @ApiOperation({ summary: 'Fuel efficiency for vehicle' })
  getFuelEfficiency(
    @Query('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getFuelEfficiency(vehicleId, from, to);
  }

  @Get('cost-per-km')
  @ApiOperation({ summary: 'Cost per km for vehicle' })
  getCostPerKm(
    @Query('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getCostPerKm(vehicleId, from, to);
  }

  @Get('vehicle-roi/:id')
  @ApiOperation({ summary: 'Vehicle ROI' })
  getVehicleRoi(@Param('id') id: string) {
    return this.analyticsService.getVehicleRoi(id);
  }

  @Get('expense-breakdown')
  @ApiOperation({ summary: 'Expense breakdown (pie chart data)' })
  getExpenseBreakdown(@Query('from') from: string, @Query('to') to: string) {
    return this.analyticsService.getExpenseBreakdown(from, to);
  }

  @Get('driver-performance')
  @ApiOperation({ summary: 'Driver performance' })
  getDriverPerformance(@Query('driverId') driverId: string) {
    return this.analyticsService.getDriverPerformance(driverId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export report (CSV/PDF)' })
  export(
    @Query('type') type: 'csv' | 'pdf',
    @Query('report') report: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.exportReport(type, report, from, to);
  }
}
