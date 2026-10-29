import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Currency, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: TransactionType.INCOME, color: '#10b981', icon: 'briefcase' },
  { name: 'Freelance', type: TransactionType.INCOME, color: '#3b82f6', icon: 'laptop' },
  { name: 'Business', type: TransactionType.INCOME, color: '#8b5cf6', icon: 'building' },
  { name: 'Other Income', type: TransactionType.INCOME, color: '#6b7280', icon: 'plus-circle' },
  { name: 'Food', type: TransactionType.EXPENSE, color: '#f59e0b', icon: 'utensils' },
  { name: 'Transport', type: TransactionType.EXPENSE, color: '#ef4444', icon: 'car' },
  { name: 'Housing', type: TransactionType.EXPENSE, color: '#ec4899', icon: 'home' },
  { name: 'Shopping', type: TransactionType.EXPENSE, color: '#f97316', icon: 'shopping-bag' },
  { name: 'Health', type: TransactionType.EXPENSE, color: '#14b8a6', icon: 'heart' },
  { name: 'Utilities', type: TransactionType.EXPENSE, color: '#6366f1', icon: 'zap' },
  { name: 'Entertainment', type: TransactionType.EXPENSE, color: '#a855f7', icon: 'film' },
  { name: 'Other Expense', type: TransactionType.EXPENSE, color: '#9ca3af', icon: 'more-horizontal' },
];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Prevent currency change if transactions exist
    if (dto.currency) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.currency !== dto.currency) {
        const txCount = await this.prisma.transaction.count({ where: { userId } });
        if (txCount > 0) {
          throw new BadRequestException(
            'Currency cannot be changed after transactions have been recorded. ' +
              'Create a new account or delete all transactions first.',
          );
        }
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.currency && { currency: dto.currency as Currency }),
      },
    });

    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens on password change
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Password changed successfully' };
  }

  async createDefaultCategories(userId: string) {
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
      })),
      skipDuplicates: true,
    });
  }
}
