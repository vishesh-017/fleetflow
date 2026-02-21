import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  async getValue(key: string): Promise<string | null> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return row?.value ?? null;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const v = await this.getValue(key);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
}
