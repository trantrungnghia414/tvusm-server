import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  async getRevenueReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.reportsService.getRevenueReport(
        period,
        startDate,
        endDate,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      throw new BadRequestException(message);
    }
  }

  @Get('bookings')
  async getBookingReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.reportsService.getBookingReport(
        period,
        startDate,
        endDate,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      throw new BadRequestException(message);
    }
  }

  @Get('customers')
  async getCustomerReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      return await this.reportsService.getCustomerReport(
        period,
        startDate,
        endDate,
        limit,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      throw new BadRequestException(message);
    }
  }

  @Get('courts')
  async getCourtReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.reportsService.getCourtReport(
        period,
        startDate,
        endDate,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      throw new BadRequestException(message);
    }
  }

  @Get('customer/:id/history')
  async getCustomerHistory(
    @Param('id', ParseIntPipe) customerId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.reportsService.getCustomerHistory(
        customerId,
        startDate,
        endDate,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      throw new BadRequestException(message);
    }
  }

  @Get('dashboard')
  async getDashboardStats(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.reportsService.getDashboardStats(
        period,
        startDate,
        endDate,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      throw new BadRequestException(message);
    }
  }
}
