import { Controller, Get, Put, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('config')
  @ApiOperation({ summary: 'Read SystemConfig (thresholds, intervals)' })
  getConfig() {
    return this.adminService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Update SystemConfig' })
  updateConfig(@Body() body: { key: string; value: string }, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? '';
    return this.adminService.updateConfig(body.key, body.value, userId);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags' })
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Put('feature-flags')
  @ApiOperation({ summary: 'Toggle feature flag' })
  updateFeatureFlag(@Body() body: { name: string; enabled: boolean }, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? '';
    return this.adminService.updateFeatureFlag(body.name, body.enabled, userId);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Full audit log with filters' })
  getAuditLog(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminService.getAuditLog({ userId, action, from, to, page, pageSize });
  }

  @Get('system-health')
  @ApiOperation({ summary: 'DB, queue, active sessions' })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('role-permissions')
  @ApiOperation({ summary: 'Current RBAC map (read-only)' })
  getRolePermissions() {
    return this.adminService.getRolePermissions();
  }
}
