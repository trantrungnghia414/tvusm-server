import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { User } from '../user/entities/user.entity';
import { Court } from '../court/entities/court.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Venue } from '../venue/entities/venue.entity';
import { CourtType } from '../court-type/entities/court-type.entity';

// ✅ Export interfaces để controller có thể sử dụng
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  courtType?: string;
  court?: string;
  limit?: number;
}

export interface FilterOptionsResponse {
  courtTypes: Array<{ type_id: number; name: string }>;
  courts: Array<{
    court_id: number;
    name: string;
    type_id: number;
  }>;
}

export interface OverviewStatsResponse {
  total_revenue: number;
  total_bookings: number;
  avg_booking_value: number;
  revenue_growth: number;
  booking_growth: number;
  top_court_type: string;
  peak_hour: string;
  repeat_customer_rate: number;
}

// Internal interfaces (không cần export)
interface CourtTypeStatsRaw {
  court_type: string;
  booking_count: string;
}

interface HourlyStatsRaw {
  hour: number;
  booking_count: string;
}

interface UserBookingCountRaw {
  user_id: number;
  booking_count: string;
}

interface RevenueTimelineRaw {
  date: string;
  revenue: string;
  bookings_count: string;
}

interface TopCustomerRaw {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_bookings: string;
  total_revenue: string;
  last_booking_date: string;
}

interface CourtPerformanceRaw {
  court_id: string;
  court_name: string;
  court_type: string;
  venue_name: string;
  total_bookings: string;
  total_revenue: string;
  avg_booking_value: string;
}

interface PaymentMethodStatsRaw {
  payment_method: string;
  total_amount: string;
  transaction_count: string;
}

interface HourlyAnalyticsRaw {
  hour: number;
  bookings_count: string;
  revenue: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    @InjectRepository(CourtType)
    private courtTypeRepository: Repository<CourtType>,
  ) {}

  async getFilterOptions(): Promise<FilterOptionsResponse> {
    try {
      console.log('🔍 ReportsService: Getting filter options...');

      const courtCount = await this.courtRepository.count();
      const venueCount = await this.venueRepository.count();
      const courtTypeCount = await this.courtTypeRepository.count();

      console.log('📊 Database counts:');
      console.log('- Courts:', courtCount);
      console.log('- Venues:', venueCount);
      console.log('- Court Types:', courtTypeCount);

      const [courtTypes, courts] = await Promise.all([
        this.courtTypeRepository.find({
          select: ['type_id', 'name'],
          order: { name: 'ASC' },
        }),
        this.courtRepository.find({
          select: ['court_id', 'name', 'type_id'],
          where: { status: 'available' },
          order: { name: 'ASC' },
        }),
      ]);

      console.log('📋 Query results:');
      console.log('- Court Types found:', courtTypes.length);
      console.log('- Courts found:', courts.length);

      if (courts.length > 0) {
        console.log('🏟️ Sample court data:', courts[0]);
      }

      const result: FilterOptionsResponse = {
        courtTypes: courtTypes.map((ct) => ({
          type_id: ct.type_id,
          name: ct.name,
        })),
        courts: courts.map((c) => ({
          court_id: c.court_id,
          name: c.name,
          type_id: c.type_id,
        })),
      };

      console.log('✅ Final result structure:', {
        courtTypes: result.courtTypes.length,
        courts: result.courts.length,
      });

      return result;
    } catch (error) {
      console.error('❌ Error in getFilterOptions:', error);
      console.error(
        'Stack trace:',
        error instanceof Error ? error.stack : 'No stack trace',
      );
      return {
        courtTypes: [],
        courts: [],
      };
    }
  }

  private applyFilters(
    query: SelectQueryBuilder<Booking>,
    filters: ReportFilters,
  ): SelectQueryBuilder<Booking> {
    const { startDate, endDate, courtType, court } = filters;

    if (startDate) {
      query = query.andWhere('booking.date >= :startDate', { startDate });
    }
    if (endDate) {
      query = query.andWhere('booking.date <= :endDate', { endDate });
    }
    if (courtType && courtType !== 'all') {
      query = query.andWhere('court.type_id = :courtType', { courtType });
    }
    if (court && court !== 'all') {
      query = query.andWhere('court.court_id = :court', { court });
    }

    return query;
  }

  async getOverviewStats(
    filters: ReportFilters,
  ): Promise<OverviewStatsResponse> {
    console.log('📊 Getting overview stats with filters:', filters);

    let query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .leftJoin('booking.payments', 'payment')
      .where('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    query = this.applyFilters(query, filters);

    const currentBookings = await query.getMany();

    // Calculate revenue only from completed payments
    let revenueQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .where('payment.status = :status', { status: 'completed' })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    if (filters.startDate) {
      revenueQuery = revenueQuery.andWhere(
        'DATE(booking.booking_date) >= :startDate',
        { startDate: filters.startDate },
      );
    }

    if (filters.endDate) {
      revenueQuery = revenueQuery.andWhere(
        'DATE(booking.booking_date) <= :endDate',
        { endDate: filters.endDate },
      );
    }

    if (filters.courtType && filters.courtType !== 'all') {
      revenueQuery = revenueQuery.andWhere(
        'courtTypeEntity.type_id = :courtType',
        { courtType: filters.courtType },
      );
    }

    if (filters.court && filters.court !== 'all') {
      revenueQuery = revenueQuery.andWhere('court.court_id = :court', {
        court: filters.court,
      });
    }

    const totalRevenue = (await revenueQuery
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .getRawOne()) as { total: string };

    const revenueAmount = Number(totalRevenue?.total || 0);
    const totalBookings = currentBookings.length;
    const avgBookingValue =
      totalBookings > 0 ? revenueAmount / totalBookings : 0;

    const { startDate, endDate, courtType, court } = filters;
    const daysDiff =
      startDate && endDate
        ? Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 30;

    const previousStartDate = startDate
      ? new Date(new Date(startDate).getTime() - daysDiff * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : null;
    const previousEndDate = startDate
      ? new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : null;

    let previousQuery = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .where('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    if (previousStartDate && previousEndDate) {
      previousQuery = this.applyFilters(previousQuery, {
        startDate: previousStartDate,
        endDate: previousEndDate,
        courtType,
        court,
      });
    }

    const previousBookings = await previousQuery.getMany();
    const previousRevenue = previousBookings.reduce(
      (sum, booking) => sum + Number(booking.total_amount),
      0,
    );
    const previousBookingCount = previousBookings.length;

    const revenueGrowth =
      previousRevenue > 0
        ? ((revenueAmount - previousRevenue) / previousRevenue) * 100
        : 0;
    const bookingGrowth =
      previousBookingCount > 0
        ? ((totalBookings - previousBookingCount) / previousBookingCount) * 100
        : 0;

    const courtTypeStats = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('courtType.name', 'court_type')
      .addSelect('COUNT(booking.booking_id)', 'booking_count')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.courtType', 'courtType')
      .where('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      })
      .groupBy('courtType.type_id')
      .orderBy('booking_count', 'DESC')
      .limit(1)
      .getRawOne<CourtTypeStatsRaw>();

    const hourlyStats = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('HOUR(booking.start_time)', 'hour')
      .addSelect('COUNT(booking.booking_id)', 'booking_count')
      .where('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      })
      .groupBy('hour')
      .orderBy('booking_count', 'DESC')
      .limit(1)
      .getRawOne<HourlyStatsRaw>();

    const peakHour = hourlyStats
      ? `${hourlyStats.hour}:00-${Number(hourlyStats.hour) + 1}:00`
      : '';

    const userBookingCounts = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.user_id', 'user_id')
      .addSelect('COUNT(booking.booking_id)', 'booking_count')
      .where('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      })
      .groupBy('booking.user_id')
      .getRawMany<UserBookingCountRaw>();

    const repeatCustomers = userBookingCounts.filter(
      (user) => Number(user.booking_count) > 1,
    ).length;
    const totalCustomers = userBookingCounts.length;
    const repeatCustomerRate =
      totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    return {
      total_revenue: revenueAmount,
      total_bookings: totalBookings,
      avg_booking_value: avgBookingValue,
      revenue_growth: revenueGrowth,
      booking_growth: bookingGrowth,
      top_court_type: courtTypeStats?.court_type || '',
      peak_hour: peakHour,
      repeat_customer_rate: repeatCustomerRate,
    };
  }

  async getRevenueTimeline(filters: ReportFilters) {
    let query = this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(booking.booking_date)', 'date')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .addSelect('COUNT(DISTINCT booking.booking_id)', 'bookings_count')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .where('payment.status = :paymentStatus', { paymentStatus: 'completed' })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    // Apply filters using the same logic as overview stats
    if (filters.startDate) {
      query = query.andWhere('DATE(booking.booking_date) >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('DATE(booking.booking_date) <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.courtType && filters.courtType !== 'all') {
      query = query.andWhere('courtTypeEntity.type_id = :courtType', {
        courtType: filters.courtType,
      });
    }

    if (filters.court && filters.court !== 'all') {
      query = query.andWhere('court.court_id = :court', {
        court: filters.court,
      });
    }

    query = query
      .groupBy('DATE(booking.booking_date)')
      .orderBy('DATE(booking.booking_date)', 'ASC');

    const results = await query.getRawMany<RevenueTimelineRaw>();

    return results.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue) || 0,
      bookings_count: Number(row.bookings_count) || 0,
    }));
  }

  async getTopCustomers(filters: ReportFilters) {
    const { limit = 10 } = filters;

    let query = this.paymentRepository
      .createQueryBuilder('payment')
      .select('user.user_id', 'customer_id')
      .addSelect('user.fullname', 'customer_name')
      .addSelect('user.email', 'customer_email')
      .addSelect('user.phone', 'customer_phone')
      .addSelect('COUNT(DISTINCT booking.booking_id)', 'total_bookings')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'total_revenue')
      .addSelect('MAX(booking.booking_date)', 'last_booking_date')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.user', 'user')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .where('payment.status = :paymentStatus', { paymentStatus: 'completed' })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    // Apply filters
    if (filters.startDate) {
      query = query.andWhere('DATE(booking.booking_date) >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('DATE(booking.booking_date) <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.courtType && filters.courtType !== 'all') {
      query = query.andWhere('courtTypeEntity.type_id = :courtType', {
        courtType: filters.courtType,
      });
    }

    if (filters.court && filters.court !== 'all') {
      query = query.andWhere('court.court_id = :court', {
        court: filters.court,
      });
    }

    query = query
      .groupBy('user.user_id')
      .orderBy('total_revenue', 'DESC')
      .limit(limit);

    const results = await query.getRawMany<TopCustomerRaw>();

    return results.map((row) => ({
      customer_id: Number(row.customer_id),
      customer_name: row.customer_name || '',
      customer_email: row.customer_email || '',
      customer_phone: row.customer_phone || '',
      total_bookings: Number(row.total_bookings),
      total_revenue: Number(row.total_revenue),
      last_booking_date: row.last_booking_date,
    }));
  }

  async getCourtPerformance(filters: ReportFilters) {
    let query = this.paymentRepository
      .createQueryBuilder('payment')
      .select('court.court_id', 'court_id')
      .addSelect('court.name', 'court_name')
      .addSelect('courtType.name', 'court_type')
      .addSelect('courtVenue.name', 'venue_name')
      .addSelect('COUNT(DISTINCT booking.booking_id)', 'total_bookings')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'total_revenue')
      .addSelect('COALESCE(AVG(payment.amount), 0)', 'avg_booking_value')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtType')
      .where('payment.status = :paymentStatus', { paymentStatus: 'completed' })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    // Apply filters
    if (filters.startDate) {
      query = query.andWhere('DATE(booking.booking_date) >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('DATE(booking.booking_date) <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.courtType && filters.courtType !== 'all') {
      query = query.andWhere('courtType.type_id = :courtType', {
        courtType: filters.courtType,
      });
    }

    if (filters.court && filters.court !== 'all') {
      query = query.andWhere('court.court_id = :court', {
        court: filters.court,
      });
    }

    query = query.groupBy('court.court_id').orderBy('total_revenue', 'DESC');

    const results = await query.getRawMany<CourtPerformanceRaw>();

    const { startDate, endDate } = filters;
    const daysDiff =
      startDate && endDate
        ? Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 30;
    const totalPossibleSlots = daysDiff * 16;

    return results.map((row) => ({
      court_id: Number(row.court_id),
      court_name: row.court_name || '',
      court_type: row.court_type || '',
      venue_name: row.venue_name || '',
      total_bookings: Number(row.total_bookings),
      total_revenue: Number(row.total_revenue),
      avg_booking_value: Number(row.avg_booking_value),
      utilization_rate: (Number(row.total_bookings) / totalPossibleSlots) * 100,
    }));
  }

  async getPaymentMethodStats(filters: ReportFilters) {
    let query = this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.payment_method', 'payment_method')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'total_amount')
      .addSelect('COUNT(payment.payment_id)', 'transaction_count')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .where('payment.status = :paymentStatus', { paymentStatus: 'completed' })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    // Apply filters
    if (filters.startDate) {
      query = query.andWhere('DATE(booking.booking_date) >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('DATE(booking.booking_date) <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.courtType && filters.courtType !== 'all') {
      query = query.andWhere('courtTypeEntity.type_id = :courtType', {
        courtType: filters.courtType,
      });
    }

    if (filters.court && filters.court !== 'all') {
      query = query.andWhere('court.court_id = :court', {
        court: filters.court,
      });
    }

    query = query.groupBy('payment.payment_method');

    const results = await query.getRawMany<PaymentMethodStatsRaw>();
    const totalAmount = results.reduce(
      (sum, row) => sum + Number(row.total_amount),
      0,
    );

    return results.map((row) => ({
      payment_method: this.formatPaymentMethod(row.payment_method),
      total_amount: Number(row.total_amount),
      transaction_count: Number(row.transaction_count),
      percentage:
        totalAmount > 0 ? (Number(row.total_amount) / totalAmount) * 100 : 0,
    }));
  }

  async getHourlyStats(filters: ReportFilters) {
    let query = this.paymentRepository
      .createQueryBuilder('payment')
      .select('HOUR(booking.start_time)', 'hour')
      .addSelect('COUNT(DISTINCT booking.booking_id)', 'bookings_count')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.court', 'court')
      .leftJoin('court.venue', 'courtVenue')
      .leftJoin('court.courtType', 'courtTypeEntity')
      .where('payment.status = :paymentStatus', { paymentStatus: 'completed' })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'completed'],
      });

    // Apply filters
    if (filters.startDate) {
      query = query.andWhere('DATE(booking.booking_date) >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('DATE(booking.booking_date) <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.courtType && filters.courtType !== 'all') {
      query = query.andWhere('courtTypeEntity.type_id = :courtType', {
        courtType: filters.courtType,
      });
    }

    if (filters.court && filters.court !== 'all') {
      query = query.andWhere('court.court_id = :court', {
        court: filters.court,
      });
    }

    query = query.groupBy('hour').orderBy('hour', 'ASC');

    const results = await query.getRawMany<HourlyAnalyticsRaw>();

    return results.map((row) => ({
      hour: `${String(row.hour).padStart(2, '0')}:00`,
      bookings_count: Number(row.bookings_count),
      revenue: Number(row.revenue),
    }));
  }

  private formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      cash: 'Tiền mặt',
      vnpay: 'VNPay',
      bank_transfer: 'Chuyển khoản',
      credit_card: 'Thẻ tín dụng',
      wallet: 'Ví điện tử',
    };

    return methodMap[method] || method;
  }
}
