import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(type: string, severity: string, message: string, entityId?: string, entityType?: string) {
    return this.prisma.notification.create({
      data: { type, severity, message, entityId, entityType },
    });
  }
}
