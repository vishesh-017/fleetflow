import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: any) {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
        used: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tenantId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!refreshToken || !refreshToken.user || refreshToken.user.deletedAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Mark token as used (will be rotated)
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { used: true },
    });

    return {
      userId: refreshToken.user.id,
      email: refreshToken.user.email,
      name: refreshToken.user.name,
      role: refreshToken.user.role,
      tenantId: refreshToken.user.tenantId,
      refreshTokenId: refreshToken.id,
    };
  }
}

