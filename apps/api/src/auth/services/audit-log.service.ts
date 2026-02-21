import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string,
    userId: string | null,
    ip: string,
    userAgent: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId,
          ip,
          userAgent,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to write audit log:', error);
    }
  }
}

