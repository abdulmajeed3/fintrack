import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, type?: TransactionType) {
    return this.prisma.category.findMany({
      where: { userId, ...(type && { type }) },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { userId, name: dto.name, type: dto.type },
    });
    if (existing) {
      throw new ConflictException(
        `A ${dto.type.toLowerCase()} category named "${dto.name}" already exists`,
      );
    }

    return this.prisma.category.create({
      data: { userId, ...dto, isDefault: false },
    });
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(userId, categoryId);

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.category.findFirst({
        where: { userId, name: dto.name, type: category.type, id: { not: categoryId } },
      });
      if (existing) {
        throw new ConflictException(
          `A ${category.type.toLowerCase()} category named "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async delete(userId: string, categoryId: string) {
    const category = await this.findOne(userId, categoryId);

    const txCount = await this.prisma.transaction.count({
      where: { userId, categoryId },
    });

    if (txCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${txCount} transaction(s). ` +
          'Reassign or delete those transactions first.',
      );
    }

    await this.prisma.budget.deleteMany({ where: { userId, categoryId } });
    await this.prisma.category.delete({ where: { id: categoryId } });

    return { message: 'Category deleted successfully' };
  }
}
