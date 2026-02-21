import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './services/audit-log.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto, ip: string, userAgent: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role || 'DISPATCHER',
        tenantId: dto.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogService.log('USER_REGISTERED', user.id, ip, userAgent, {
      email: user.email,
      role: user.role,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    return { ...tokens, user };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      await this.auditLogService.log('LOGIN_FAILED', null, ip, userAgent, {
        email: dto.email,
        reason: 'User not found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.auditLogService.log('LOGIN_FAILED', user.id, ip, userAgent, {
        email: dto.email,
        reason: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditLogService.log('LOGIN_SUCCESS', user.id, ip, userAgent, {
      email: user.email,
      role: user.role,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refreshToken(refreshToken: string, ip: string, userAgent: string) {
    let payload: { sub?: string; jti?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { sub: userId, jti: tokenId } = payload;
    if (!userId || !tokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.userId !== userId ||
      tokenRecord.used ||
      tokenRecord.expiresAt <= new Date() ||
      tokenRecord.user.deletedAt
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, tokenRecord.token);
    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { used: true },
    });

    const newTokens = await this.generateTokens(
      tokenRecord.userId,
      tokenRecord.user.email,
      tokenRecord.user.role,
      tokenRecord.user.tenantId,
    );

    await this.auditLogService.log('TOKEN_REFRESHED', tokenRecord.userId, ip, userAgent);

    return newTokens;
  }

  async logout(userId: string, ip: string, userAgent: string) {
    // Invalidate all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
      },
    });

    await this.auditLogService.log('LOGOUT', userId, ip, userAgent);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return 200 to prevent email enumeration
    if (!user || user.deletedAt) {
      return { message: 'If the email exists, a reset code has been sent' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Delete old OTPs for this email
    await this.prisma.passwordResetOTP.deleteMany({
      where: { email: dto.email, used: false },
    });

    // Create new OTP
    await this.prisma.passwordResetOTP.create({
      data: {
        email: dto.email,
        otp: hashedOtp,
        expiresAt,
      },
    });

    // In production, send email here
    console.log(`Password reset OTP for ${dto.email}: ${otp}`);

    await this.auditLogService.log('PASSWORD_RESET_REQUESTED', user.id, ip, userAgent, {
      email: dto.email,
    });

    return { message: 'If the email exists, a reset code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw new BadRequestException('Invalid reset request');
    }

    const otpRecord = await this.prisma.passwordResetOTP.findFirst({
      where: {
        email: dto.email,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isOtpValid = await bcrypt.compare(dto.otp, otpRecord.otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark OTP as used
    await this.prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    await this.auditLogService.log('PASSWORD_RESET_COMPLETED', user.id, ip, userAgent, {
      email: dto.email,
    });

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(userId: string, email: string, role: string, tenantId: string) {
    const payload = { sub: userId, email, role, tenantId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create placeholder record so we have id for jti, then update with hashed token after signing
    const placeholder = `pending-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        token: placeholder,
        expiresAt,
      },
    });

    const refreshPayload = { ...payload, jti: record.id };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { token: hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

