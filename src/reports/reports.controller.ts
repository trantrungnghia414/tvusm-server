import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from 'src/reports/reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Thêm endpoint để lấy danh sách courts cho filter
  @Get('filter-options')
  async getFilterOptions() {
    return this.reportsService.getFilterOptions();
  }

  @Get('stats')
  async getOverviewStats(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('court_type') courtType?: string,
    @Query('court') court?: string,
  ) {
    return this.reportsService.getOverviewStats({
      startDate,
      endDate,
      courtType,
      court,
    });
  }

  @Get('revenue-timeline')
  async getRevenueTimeline(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('court_type') courtType?: string,
    @Query('court') court?: string,
  ) {
    return this.reportsService.getRevenueTimeline({
      startDate,
      endDate,
      courtType,
      court,
    });
  }

  @Get('top-customers')
  async getTopCustomers(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('court_type') courtType?: string,
    @Query('court') court?: string,
    @Query('limit') limit = 10,
  ) {
    return this.reportsService.getTopCustomers({
      startDate,
      endDate,
      courtType,
      court,
      limit: Number(limit),
    });
  }

  @Get('court-performance')
  async getCourtPerformance(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('court_type') courtType?: string,
    @Query('court') court?: string,
  ) {
    return this.reportsService.getCourtPerformance({
      startDate,
      endDate,
      courtType,
      court,
    });
  }

  @Get('payment-methods')
  async getPaymentMethodStats(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('court_type') courtType?: string,
    @Query('court') court?: string,
  ) {
    return this.reportsService.getPaymentMethodStats({
      startDate,
      endDate,
      courtType,
      court,
    });
  }

  @Get('hourly-stats')
  async getHourlyStats(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('court_type') courtType?: string,
    @Query('court') court?: string,
  ) {
    return this.reportsService.getHourlyStats({
      startDate,
      endDate,
      courtType,
      court,
    });
  }
}
