import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getConfig() {
    const rows = await this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.key, { value: r.value, description: r.description }]));
  }

  async updateConfig(key: string, value: string, updatedBy: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, description: '' },
      update: { value, updatedBy },
    });
  }

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
  }

  async updateFeatureFlag(name: string, enabled: boolean, lastChangedBy: string) {
    return this.prisma.featureFlag.upsert({
      where: { name },
      create: { name, enabled, description: '' },
      update: { enabled, lastChangedBy },
    });
  }

  async getAuditLog(filters: { userId?: string; action?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
    const { userId, action, from, to, page = 1, pageSize = 20 } = filters;
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getSystemHealth() {
    let database: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      database,
      apiLatency: 0,
      activeSessions: 0,
      uptime: process.uptime().toFixed(0),
    };
  }

  getRolePermissions() {
    const ROLE_HIERARCHY: Record<string, number> = {
      ADMIN: 100,
      MANAGER: 80,
      DISPATCHER: 60,
      SAFETY_OFFICER: 60,
      FINANCE: 60,
    };
    return {
      ADMIN: ['all'],
      MANAGER: ['vehicles', 'trips', 'drivers', 'maintenance', 'fuel', 'expenses', 'analytics'],
      DISPATCHER: ['trips', 'vehicles:available', 'drivers'],
      SAFETY_OFFICER: ['drivers', 'violations', 'analytics'],
      FINANCE: ['expenses', 'fuel', 'analytics', 'reports'],
      hierarchy: ROLE_HIERARCHY,
    };
  }
}
