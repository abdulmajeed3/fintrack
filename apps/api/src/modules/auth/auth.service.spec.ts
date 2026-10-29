import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, def?: unknown) => {
    const config: Record<string, unknown> = {
      'app.jwt.accessSecret': 'test-secret',
      'app.jwt.refreshSecret': 'test-refresh-secret',
      'app.jwt.accessExpiresIn': '15m',
      'app.jwt.refreshExpiresIn': '7d',
    };
    return config[key] ?? def;
  }),
};

const mockUsersService = {
  createDefaultCategories: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash the password with argon2id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }: any) => ({
        id: 'user-uuid',
        email: data.email,
        name: data.name,
        currency: 'USD',
        passwordHash: data.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.register({
        name: 'Test',
        email: 'test@example.com',
        password: 'Password@123',
      });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const hash = createCall.data.passwordHash;
      expect(hash).not.toBe('Password@123');
      const isValid = await argon2.verify(hash, 'Password@123');
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const passwordHash = await argon2.hash('Password@123');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test',
        currency: 'USD',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await argon2.hash('CorrectPassword@1');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@example.com',
        passwordHash,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword@1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'Password@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not expose which part of credentials was wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      try {
        await service.login({ email: 'nobody@example.com', password: 'Password@123' });
      } catch (err: any) {
        expect(err.message).toBe('Invalid email or password');
      }
    });
  });

  describe('sanitizeUser', () => {
    it('should not include passwordHash in returned user', () => {
      const user = {
        id: 'uuid',
        email: 'test@test.com',
        name: 'Test',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = service.sanitizeUser(user);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
    });
  });
});
