import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { Payment } from '../payment/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { Court } from '../court/entities/court.entity';

// Helper interfaces for type safety
interface PaymentMethodData {
  revenue: number;
  count: number;
}

interface CustomerStatsData {
  customer: User;
  bookingCount: number;
  totalSpent: number;
  lastBooking: Date;
}

interface RevenueQueryResult {
  total: string | null;
}

interface UserIdQueryResult {
  booking_user_id: number;
}

export interface RevenueReportData {
  period: string;
  totalRevenue: number;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    bookingCount: number;
  }>;
  revenueByPaymentMethod: Array<{
    method: string;
    revenue: number;
    count: number;
  }>;
  growthRate?: number;
}

export interface BookingReportData {
  period: string;
  totalBookings: number;
  bookingsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  bookingsByDay: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  averageBookingValue: number;
  peakHours: Array<{
    hour: string;
    count: number;
  }>;
}

export interface CustomerReportData {
  period: string;
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  topCustomers: Array<{
    customer: {
      user_id: number;
      username: string;
      fullname?: string;
      email: string;
      phone?: string;
    };
    bookingCount: number;
    totalSpent: number;
    lastBooking: string;
  }>;
  customerRetention: number;
}

export interface CourtReportData {
  period: string;
  courtUsage: Array<{
    court: {
      court_id: number;
      name: string;
      code: string;
      type_name?: string;
      venue_name?: string;
    };
    bookingCount: number;
    revenue: number;
    utilizationRate: number;
    averageBookingDuration: number;
  }>;
  mostPopularCourts: Array<{
    court_id: number;
    court_name: string;
    booking_count: number;
  }>;
  leastUsedCourts: Array<{
    court_id: number;
    court_name: string;
    booking_count: number;
  }>;
}

export interface CustomerHistoryData {
  customer: {
    user_id: number;
    username: string;
    fullname?: string;
    email: string;
    phone?: string;
  };
  totalBookings: number;
  totalSpent: number;
  bookings: Array<{
    booking_id: number;
    booking_code: string;
    court_name: string;
    date: string;
    start_time: string;
    end_time: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
}

export interface DashboardStatsData {
  period: string;
  revenue: {
    total: number;
    growth: number;
    target?: number;
    achievement?: number;
  };
  bookings: {
    total: number;
    growth: number;
    avgValue: number;
  };
  customers: {
    total: number;
    active: number;
    new: number;
    retention: number;
  };
  courts: {
    totalCourts: number;
    avgUtilization: number;
    topPerformer: string;
  };
  trends: {
    revenueChart: Array<{ date: string; revenue: number }>;
    bookingsChart: Array<{ date: string; bookings: number }>;
  };
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
  ) {}

  private getDateRange(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period) {
      switch (period) {
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start = new Date(now);
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start = new Date(now);
          start.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          start = new Date('2020-01-01');
          break;
      }
    } else {
      // Default to current month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }

  async getRevenueReport(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<RevenueReportData> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Get completed payments within date range
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .where('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at BETWEEN :start AND :end', { start, end })
      .getMany();

    const totalRevenue = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    // Revenue by day
    const revenueByDay = this.groupByDay(payments, start, end);

    // Revenue by payment method
    const revenueByPaymentMethod = this.groupByPaymentMethod(payments);

    // Calculate growth rate (compared to previous period)
    const growthRate = await this.calculateGrowthRate(start, end, totalRevenue);

    return {
      period: period || 'custom',
      totalRevenue,
      revenueByDay,
      revenueByPaymentMethod,
      growthRate,
    };
  }

  async getBookingReport(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<BookingReportData> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.court', 'court')
      .where('booking.created_at BETWEEN :start AND :end', { start, end })
      .getMany();

    const totalBookings = bookings.length;

    // Bookings by status
    const bookingsByStatus = this.groupBookingsByStatus(bookings);

    // Bookings by day
    const bookingsByDay = this.groupBookingsByDay(bookings, start, end);

    // Average booking value
    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + (booking.total_amount || 0),
      0,
    );
    const averageBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Peak hours
    const peakHours = this.calculatePeakHours(bookings);

    return {
      period: period || 'custom',
      totalBookings,
      bookingsByStatus,
      bookingsByDay,
      averageBookingValue,
      peakHours,
    };
  }

  async getCustomerReport(
    period?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 10,
  ): Promise<CustomerReportData> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Get customers with bookings in period
    const customersWithBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .where('booking.created_at BETWEEN :start AND :end', { start, end })
      .getMany();

    const customerStats = this.calculateCustomerStats(
      customersWithBookings,
      limit,
    );

    const totalCustomers = await this.userRepository.count();
    const activeCustomers = customerStats.activeCustomers;
    const newCustomers = await this.userRepository.count({
      where: { created_at: Between(start, end) },
    });

    const customerRetention = await this.calculateCustomerRetention(start, end);

    return {
      period: period || 'custom',
      totalCustomers,
      activeCustomers,
      newCustomers,
      topCustomers: customerStats.topCustomers,
      customerRetention,
    };
  }

  async getCourtReport(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CourtReportData> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const courts = await this.courtRepository
      .createQueryBuilder('court')
      .leftJoinAndSelect('court.venue', 'venue')
      .leftJoinAndSelect('court.courtType', 'courtType')
      .getMany();

    // Get bookings for each court in the period
    const courtUsage = await Promise.all(
      courts.map(async (court) => {
        const bookings = await this.bookingRepository
          .createQueryBuilder('booking')
          .where('booking.court_id = :courtId', { courtId: court.court_id })
          .andWhere('booking.created_at BETWEEN :start AND :end', {
            start,
            end,
          })
          .andWhere('booking.status IN (:...statuses)', {
            statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
          })
          .getMany();

        const bookingCount = bookings.length;
        const revenue = bookings.reduce(
          (sum, booking) => sum + (booking.total_amount || 0),
          0,
        );

        // Calculate utilization rate (simplified)
        const totalHoursInPeriod = this.calculateTotalHours(start, end);
        const bookedHours = bookings.reduce((sum, booking) => {
          const startTime = new Date(`2023-01-01 ${booking.start_time}`);
          const endTime = new Date(`2023-01-01 ${booking.end_time}`);
          return (
            sum + (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
          );
        }, 0);

        const utilizationRate =
          totalHoursInPeriod > 0 ? (bookedHours / totalHoursInPeriod) * 100 : 0;
        const averageBookingDuration =
          bookingCount > 0 ? bookedHours / bookingCount : 0;

        return {
          court: {
            court_id: court.court_id,
            name: court.name,
            code: court.code,
            type_name: court.courtType?.name,
            venue_name: court.venue?.name,
          },
          bookingCount,
          revenue,
          utilizationRate,
          averageBookingDuration,
        };
      }),
    );

    // Sort courts by booking count for most/least popular
    const sortedByBookings = [...courtUsage].sort(
      (a, b) => b.bookingCount - a.bookingCount,
    );

    const mostPopularCourts = sortedByBookings.slice(0, 5).map((court) => ({
      court_id: court.court.court_id,
      court_name: court.court.name,
      booking_count: court.bookingCount,
    }));

    const leastUsedCourts = sortedByBookings
      .slice(-5)
      .reverse()
      .map((court) => ({
        court_id: court.court.court_id,
        court_name: court.court.name,
        booking_count: court.bookingCount,
      }));

    return {
      period: period || 'custom',
      courtUsage,
      mostPopularCourts,
      leastUsedCourts,
    };
  }

  async getCustomerHistory(
    customerId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<CustomerHistoryData> {
    const customer = await this.userRepository.findOne({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const dateWhere =
      startDate && endDate
        ? { created_at: Between(new Date(startDate), new Date(endDate)) }
        : {};

    const bookings = await this.bookingRepository.find({
      where: { user_id: customerId, ...dateWhere },
      relations: ['court'],
      order: { created_at: 'DESC' },
    });

    const totalBookings = bookings.length;
    const totalSpent = bookings.reduce(
      (sum, booking) => sum + (booking.total_amount || 0),
      0,
    );

    const bookingHistory = bookings.map((booking) => ({
      booking_id: booking.booking_id,
      booking_code: booking.booking_code,
      court_name: booking.court?.name || 'N/A',
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      total_amount: booking.total_amount || 0,
      status: booking.status,
      payment_status: booking.payment_status,
      created_at: booking.created_at.toISOString(),
    }));

    return {
      customer: {
        user_id: customer.user_id,
        username: customer.username,
        fullname: customer.fullname,
        email: customer.email,
        phone: customer.phone,
      },
      totalBookings,
      totalSpent,
      bookings: bookingHistory,
    };
  }

  async getDashboardStats(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStatsData> {
    const revenueReport = await this.getRevenueReport(
      period,
      startDate,
      endDate,
    );
    const bookingReport = await this.getBookingReport(
      period,
      startDate,
      endDate,
    );
    const customerReport = await this.getCustomerReport(
      period,
      startDate,
      endDate,
    );
    const courtReport = await this.getCourtReport(period, startDate, endDate);

    const avgUtilization =
      courtReport.courtUsage.reduce(
        (sum, court) => sum + court.utilizationRate,
        0,
      ) / courtReport.courtUsage.length;
    const topPerformer = courtReport.mostPopularCourts[0]?.court_name || 'N/A';

    return {
      period: period || 'custom',
      revenue: {
        total: revenueReport.totalRevenue,
        growth: revenueReport.growthRate || 0,
      },
      bookings: {
        total: bookingReport.totalBookings,
        growth: 0, // Calculate separately if needed
        avgValue: bookingReport.averageBookingValue,
      },
      customers: {
        total: customerReport.totalCustomers,
        active: customerReport.activeCustomers,
        new: customerReport.newCustomers,
        retention: customerReport.customerRetention,
      },
      courts: {
        totalCourts: courtReport.courtUsage.length,
        avgUtilization,
        topPerformer,
      },
      trends: {
        revenueChart: revenueReport.revenueByDay.map((item) => ({
          date: item.date,
          revenue: item.revenue,
        })),
        bookingsChart: bookingReport.bookingsByDay.map((item) => ({
          date: item.date,
          bookings: item.count,
        })),
      },
    };
  }

  // Helper methods
  private groupByDay(payments: Payment[], start: Date, end: Date) {
    const days: Array<{ date: string; revenue: number; bookingCount: number }> =
      [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayPayments = payments.filter((p) => {
        const paidAt = new Date(p.paid_at);
        return paidAt.toISOString().split('T')[0] === dateStr;
      });

      days.push({
        date: dateStr,
        revenue: dayPayments.reduce((sum, p) => sum + p.amount, 0),
        bookingCount: dayPayments.length,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  private groupByPaymentMethod(payments: Payment[]) {
    const methods = new Map<string, PaymentMethodData>();

    payments.forEach((payment) => {
      const method = payment.payment_method;
      if (!methods.has(method)) {
        methods.set(method, { revenue: 0, count: 0 });
      }
      const current = methods.get(method)!;
      current.revenue += payment.amount;
      current.count += 1;
    });

    return Array.from(methods.entries()).map(([method, data]) => ({
      method,
      revenue: data.revenue,
      count: data.count,
    }));
  }

  private async calculateGrowthRate(
    start: Date,
    end: Date,
    currentRevenue: number,
  ): Promise<number> {
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = new Date(start);

    const previousRevenueResult = (await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at BETWEEN :start AND :end', {
        start: previousStart,
        end: previousEnd,
      })
      .getRawOne()) as RevenueQueryResult;

    const previousRevenue = parseFloat(previousRevenueResult?.total || '0');

    return previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
  }

  private groupBookingsByStatus(bookings: Booking[]) {
    const statusCount = new Map<string, number>();
    const total = bookings.length;

    bookings.forEach((booking) => {
      const status = booking.status;
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });

    return Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  private groupBookingsByDay(bookings: Booking[], start: Date, end: Date) {
    const days: Array<{ date: string; count: number; revenue: number }> = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayBookings = bookings.filter((b) => {
        const createdAt = new Date(b.created_at);
        return createdAt.toISOString().split('T')[0] === dateStr;
      });

      days.push({
        date: dateStr,
        count: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  private calculatePeakHours(bookings: Booking[]) {
    const hourCount = new Map<string, number>();

    bookings.forEach((booking) => {
      const startHour = booking.start_time.split(':')[0];
      hourCount.set(startHour, (hourCount.get(startHour) || 0) + 1);
    });

    return Array.from(hourCount.entries())
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateCustomerStats(bookings: Booking[], limit: number) {
    const customerMap = new Map<number, CustomerStatsData>();

    bookings.forEach((booking) => {
      if (!booking.user) return;

      const userId = booking.user.user_id;
      if (!customerMap.has(userId)) {
        customerMap.set(userId, {
          customer: booking.user,
          bookingCount: 0,
          totalSpent: 0,
          lastBooking: booking.created_at,
        });
      }

      const customer = customerMap.get(userId)!;
      customer.bookingCount += 1;
      customer.totalSpent += booking.total_amount || 0;
      if (booking.created_at > customer.lastBooking) {
        customer.lastBooking = booking.created_at;
      }
    });

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit)
      .map((customer) => ({
        customer: {
          user_id: customer.customer.user_id,
          username: customer.customer.username,
          fullname: customer.customer.fullname,
          email: customer.customer.email,
          phone: customer.customer.phone,
        },
        bookingCount: customer.bookingCount,
        totalSpent: customer.totalSpent,
        lastBooking: customer.lastBooking.toISOString(),
      }));

    return {
      activeCustomers: customerMap.size,
      topCustomers,
    };
  }

  private async calculateCustomerRetention(
    start: Date,
    end: Date,
  ): Promise<number> {
    // This is a simplified calculation
    const previousPeriodStart = new Date(
      start.getTime() - (end.getTime() - start.getTime()),
    );

    const currentCustomers = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DISTINCT booking.user_id', 'booking_user_id')
      .where('booking.created_at BETWEEN :start AND :end', { start, end })
      .getRawMany();

    const previousCustomers = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DISTINCT booking.user_id', 'booking_user_id')
      .where('booking.created_at BETWEEN :start AND :end', {
        start: previousPeriodStart,
        end: start,
      })
      .getRawMany();

    const currentUserIds = new Set(
      currentCustomers.map((c: UserIdQueryResult) => c.booking_user_id),
    );
    const previousUserIds = new Set(
      previousCustomers.map((c: UserIdQueryResult) => c.booking_user_id),
    );

    const retainedCustomers = [...currentUserIds].filter((id) =>
      previousUserIds.has(id),
    );

    return previousUserIds.size > 0
      ? (retainedCustomers.length / previousUserIds.size) * 100
      : 0;
  }

  private calculateTotalHours(start: Date, end: Date): number {
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    // Assuming 16 operating hours per day (6 AM to 10 PM)
    return days * 16;
  }
}
