import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('insights')
@Controller('insights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Smart expense insights for a month vs previous month' })
  @ApiQuery({ name: 'month', type: Number, required: false })
  @ApiQuery({ name: 'year', type: Number, required: false })
  async getMonthlyInsights(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<object> {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.insightsService.getMonthlyInsights(user.sub, m, y);
  }
}
