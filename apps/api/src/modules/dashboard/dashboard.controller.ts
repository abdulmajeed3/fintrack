import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard summary for a given month/year' })
  @ApiQuery({ name: 'month', type: Number, required: false })
  @ApiQuery({ name: 'year', type: Number, required: false })
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.dashboardService.getSummary(user.sub, m, y);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get monthly income/expense trend (last N months)' })
  @ApiQuery({ name: 'months', type: Number, required: false })
  async getTrend(
    @CurrentUser() user: JwtPayload,
    @Query('months') months?: string,
  ) {
    const m = months ? Math.min(parseInt(months, 10), 24) : 6;
    return this.dashboardService.getMonthlyTrend(user.sub, m);
  }
}
