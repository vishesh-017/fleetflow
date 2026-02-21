import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './services/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetOTP: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockAuditLog = { log: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-token'),
            verify: jest.fn((token: string) => ({
              sub: 'user-1',
              jti: 'token-id-1',
            })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                JWT_SECRET: 'secret',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return map[key];
            }),
          },
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLog,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: hashed,
        name: 'Test',
        role: 'DISPATCHER',
        tenantId: 't1',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
      mockPrisma.refreshToken.update.mockResolvedValue({});

      const dto: LoginDto = { email: 'test@test.com', password: 'password123' };
      const result = await service.login(dto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@test.com');
      expect(mockAuditLog.log).toHaveBeenCalledWith('LOGIN_SUCCESS', 'user-1', '127.0.0.1', 'test-agent', expect.any(Object));
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const hashed = await bcrypt.hash('other', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: hashed,
        name: 'Test',
        role: 'DISPATCHER',
        tenantId: 't1',
        deletedAt: null,
      });

      const dto: LoginDto = { email: 'test@test.com', password: 'wrong' };
      await expect(service.login(dto, '127.0.0.1', '')).rejects.toThrow(UnauthorizedException);
      expect(mockAuditLog.log).toHaveBeenCalledWith('LOGIN_FAILED', 'user-1', '127.0.0.1', '', expect.any(Object));
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const dto: LoginDto = { email: 'nobody@test.com', password: 'any' };
      await expect(service.login(dto, '127.0.0.1', '')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
        deletedAt: null,
      });

      const dto: RegisterDto = {
        email: 'existing@test.com',
        password: 'pass123',
        name: 'User',
        tenantId: 't1',
      };
      await expect(service.register(dto, '127.0.0.1', '')).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const validRefreshToken = 'valid-refresh-jwt';
      const hashedStored = await bcrypt.hash(validRefreshToken, 10);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-1',
        token: hashedStored,
        used: false,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user-1',
          email: 'u@t.com',
          role: 'DISPATCHER',
          tenantId: 't1',
          deletedAt: null,
        },
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'new-rt' });

      const result = await service.refreshToken(validRefreshToken, '127.0.0.1', '');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'token-id-1' }, data: { used: true } }),
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const jwtService = (service as any).jwtService;
      jwtService.verify = jest.fn(() => {
        throw new Error('invalid');
      });
      await expect(service.refreshToken('bad-token', '127.0.0.1', '')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException when OTP is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'u@t.com',
        deletedAt: null,
      });
      mockPrisma.passwordResetOTP.findFirst.mockResolvedValue(null);

      const dto: ResetPasswordDto = {
        email: 'u@t.com',
        otp: '123456',
        newPassword: 'newpass123',
      };
      await expect(service.resetPassword(dto, '127.0.0.1', '')).rejects.toThrow(BadRequestException);
    });
  });
});
