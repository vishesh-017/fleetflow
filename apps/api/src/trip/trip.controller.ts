import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TripService } from './trip.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripFilterDto } from './dto/trip-filter.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';

@ApiTags('trips')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create trip (validates all business rules in transaction)' })
  create(@Body() dto: CreateTripDto, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? '';
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.tripService.create(dto, userId, ip, userAgent);
  }

  @Get()
  @ApiOperation({ summary: 'List trips with filters' })
  list(@Query() filters: TripFilterDto) {
    return this.tripService.list(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'All currently active trips (dashboard)' })
  getActive() {
    return this.tripService.getActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trip detail with vehicle, driver, fuel logs' })
  getById(@Param('id') id: string) {
    return this.tripService.getById(id);
  }

  @Patch(':id/dispatch')
  @Roles(UserRole.DISPATCHER, UserRole.MANAGER)
  @ApiOperation({ summary: 'DRAFT → DISPATCHED' })
  dispatch(@Param('id') id: string) {
    return this.tripService.dispatch(id);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'DISPATCHED → IN_PROGRESS' })
  start(@Param('id') id: string) {
    return this.tripService.start(id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'IN_PROGRESS → COMPLETED, release vehicle and driver' })
  complete(@Param('id') id: string) {
    return this.tripService.complete(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel trip (DRAFT or DISPATCHED) with reason' })
  cancel(@Param('id') id: string, @Body() dto: CancelTripDto) {
    return this.tripService.cancel(id, dto);
  }
}
