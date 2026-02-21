import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, DriverStatus } from '@prisma/client';
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { CreateViolationDto } from './dto/create-violation.dto';
import { DriverStatusDto } from './dto/driver-status.dto';

@ApiTags('drivers')
@Controller('drivers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @ApiOperation({ summary: 'List drivers' })
  list(@Query('page') page?: number, @Query('pageSize') pageSize?: number, @Query('status') status?: DriverStatus) {
    return this.driverService.list({ page, pageSize, status });
  }

  @Get('expiring-licenses')
  @ApiOperation({ summary: 'Licenses expiring in next 30 days' })
  getExpiringLicenses(@Query('withinDays') withinDays?: string) {
    return this.driverService.getExpiringLicenses(withinDays ? parseInt(withinDays, 10) : 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Driver detail' })
  getById(@Param('id') id: string) {
    return this.driverService.getById(id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Trip stats, safety score, violation history' })
  getPerformance(@Param('id') id: string) {
    return this.driverService.getPerformance(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create driver' })
  create(@Body() dto: CreateDriverDto) {
    return this.driverService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update driver' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driverService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete driver' })
  remove(@Param('id') id: string) {
    return this.driverService.remove(id);
  }

  @Post(':id/violations')
  @Roles(UserRole.SAFETY_OFFICER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record violation' })
  addViolation(@Param('id') id: string, @Body() dto: CreateViolationDto, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? '';
    return this.driverService.addViolation(id, dto, userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manual status override (ADMIN only)' })
  setStatus(@Param('id') id: string, @Body() dto: DriverStatusDto) {
    return this.driverService.setStatus(id, dto);
  }
}
