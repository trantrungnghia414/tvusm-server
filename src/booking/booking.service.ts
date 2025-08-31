import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindManyOptions, FindOptionsWhere } from 'typeorm';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
} from './entities/booking.entity';
import { Court } from '../court/entities/court.entity';
import { CourtMapping } from '../court-mapping/entities/court-mapping.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatsDto } from './dto/stats.dto';
import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payment/payment.service';
import { PaymentMethod } from '../payment/entities/payment.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(CourtMapping)
    private courtMappingRepository: Repository<CourtMapping>,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // ✅ Cập nhật method create để user_id bắt buộc
  async create(
    createBookingDto: CreateBookingDto,
    userId: number,
  ): Promise<Booking> {
    try {
      console.log('🔄 Creating booking with userId:', userId);
      console.log('📝 Booking data:', createBookingDto);

      if (!userId) {
        throw new BadRequestException('User ID là bắt buộc để đặt sân');
      }

      // Kiểm tra sân có tồn tại
      const court = await this.courtRepository.findOne({
        where: { court_id: createBookingDto.court_id },
      });

      if (!court) {
        throw new NotFoundException(
          `Không tìm thấy sân với id ${createBookingDto.court_id}`,
        );
      }

      if (court.status !== 'available') {
        throw new BadRequestException('Sân này hiện không khả dụng để đặt');
      }

      // Kiểm tra khung giờ có sẵn
      const isTimeSlotAvailable = await this.checkAvailability(
        createBookingDto.court_id,
        createBookingDto.date,
        createBookingDto.start_time,
        createBookingDto.end_time,
      );

      if (!isTimeSlotAvailable) {
        throw new ConflictException(
          'Khung giờ này đã được đặt, vui lòng chọn khung giờ khác',
        );
      }

      // Tính tổng tiền
      const startTime = createBookingDto.start_time;
      const endTime = createBookingDto.end_time;

      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]) || 0;
      const endHour = parseInt(endTime.split(':')[0]);
      const endMinute = parseInt(endTime.split(':')[1]) || 0;

      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      const durationInHours = (endTimeInMinutes - startTimeInMinutes) / 60;

      const totalAmount = Math.max(
        10000,
        Math.round(court.hourly_rate * durationInHours),
      );

      console.log(
        `💰 Court rate: ${court.hourly_rate}, Duration: ${durationInHours}h, Total: ${totalAmount}`,
      );

      // ✅ Xác định payment status dựa trên payment method
      const paymentMethod = createBookingDto.payment_method || 'cash'; // ✅ Sử dụng string
      const initialPaymentStatus =
        paymentMethod === 'vnpay'
          ? PaymentStatus.UNPAID // VNPay sẽ pending cho đến khi thanh toán
          : PaymentStatus.UNPAID; // Cash cũng unpaid ban đầu

      const bookingData = {
        court_id: createBookingDto.court_id,
        user_id: userId,
        date: createBookingDto.date,
        booking_date: createBookingDto.date,
        start_time: createBookingDto.start_time,
        end_time: createBookingDto.end_time,
        renter_name: createBookingDto.renter_name,
        renter_phone: createBookingDto.renter_phone,
        renter_email: createBookingDto.renter_email?.trim() || null,
        notes: createBookingDto.notes || null,
        total_amount: totalAmount,
        status: BookingStatus.CONFIRMED, // ✅ Booking confirmed ngay
        booking_code: `BK${Date.now()}${Math.floor(Math.random() * 1000)}`,
        booking_type: 'public', // ✅ Sử dụng string
        payment_status: initialPaymentStatus,
        payment_method: paymentMethod, // ✅ Lưu payment method
      };

      console.log('💾 Saving booking data:', bookingData);

      const newBooking = this.bookingRepository.create(bookingData);
      const savedBooking = await this.bookingRepository.save(newBooking);

      console.log('✅ Booking saved successfully:', {
        booking_id: savedBooking.booking_id,
        total_amount: savedBooking.total_amount,
        payment_method: paymentMethod,
        payment_status: savedBooking.payment_status,
      });

      // ✅ Tự động tạo payment record cho thanh toán tiền mặt
      if (paymentMethod === 'cash') {
        try {
          const paymentData = {
            user_id: userId,
            booking_id: savedBooking.booking_id,
            amount: totalAmount,
            payment_method: PaymentMethod.CASH,
            description: `Thanh toán đặt sân #${savedBooking.booking_code}`,
          };

          await this.paymentService.create(paymentData);

          console.log(
            '✅ Created payment record for cash payment with pending status',
          );
        } catch (paymentError) {
          console.error(
            '❌ Error creating payment record for cash:',
            paymentError,
          );
          // Không throw error để không ảnh hưởng đến booking creation
        }
      }

      // ✅ Chỉ tạo thông báo cho cash payment, VNPay sẽ tạo sau khi thanh toán thành công
      if (paymentMethod === 'cash') {
        try {
          await this.notificationService.createBookingNotification(
            userId,
            savedBooking.booking_id,
            'created',
            savedBooking.booking_code,
          );
          console.log(`📅 Created booking notification for user ${userId}`);
        } catch (notificationError) {
          console.error('❌ Error creating notification:', notificationError);
        }
      }

      return savedBooking;
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      throw error;
    }
  }

  // ✅ Cập nhật updateStatus method để handle null user_id
  async updateStatus(bookingId: number, status: BookingStatus) {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { booking_id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      booking.status = status;
      const updatedBooking = await this.bookingRepository.save(booking);

      // ✅ Chỉ tạo thông báo nếu có user_id
      if (booking.user_id) {
        try {
          if (status === BookingStatus.CONFIRMED) {
            await this.notificationService.createBookingNotification(
              booking.user_id,
              bookingId,
              'confirmed',
              booking.booking_code,
            );
            console.log(
              `✅ Sent confirmation notification for booking ${booking.booking_code}`,
            );
          } else if (status === BookingStatus.CANCELLED) {
            await this.notificationService.createBookingNotification(
              booking.user_id,
              bookingId,
              'cancelled',
              booking.booking_code,
            );
            console.log(
              `❌ Sent cancellation notification for booking ${booking.booking_code}`,
            );
          }
        } catch (notificationError) {
          console.error(
            '❌ Error creating status notification:',
            notificationError,
          );
        }
      }

      return updatedBooking;
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  async findAll(
    status?: string,
    date?: string,
    courtId?: number,
  ): Promise<Booking[]> {
    const queryOptions: FindManyOptions<Booking> = {
      relations: ['court', 'user'],
      order: { created_at: 'DESC' },
    };

    // Khởi tạo đối tượng where nếu có điều kiện
    const whereClause: FindOptionsWhere<Booking> = {};

    // ✅ Sửa lỗi: Convert string status to enum
    if (status) {
      const bookingStatus = this.mapStringToBookingStatus(status);
      if (bookingStatus) {
        whereClause.status = bookingStatus;
      }
    }

    if (date) {
      whereClause.date = date;
    }

    if (courtId) {
      whereClause.court_id = courtId;
    }

    // Chỉ thêm điều kiện where nếu có ít nhất một điều kiện
    if (Object.keys(whereClause).length > 0) {
      queryOptions.where = whereClause;
    }

    return this.bookingRepository.find(queryOptions);
  }

  async findOne(id: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { booking_id: id },
      relations: ['court', 'court.venue'],
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đặt sân với id ${id}`);
    }

    return booking;
  }

  async findBookingsByUserId(userId: number): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { user_id: userId },
      relations: ['court', 'court.venue', 'court.courtType'],
      order: { created_at: 'DESC' },
    });
  }

  async update(
    id: number,
    updateBookingDto: UpdateBookingDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // ✅ Sử dụng enum để so sánh
    if (
      booking.status !== BookingStatus.PENDING &&
      (updateBookingDto.court_id ||
        updateBookingDto.date ||
        updateBookingDto.start_time ||
        updateBookingDto.end_time)
    ) {
      throw new BadRequestException(
        'Không thể thay đổi sân, ngày hoặc giờ của đặt sân đã xác nhận',
      );
    }

    // ✅ Cập nhật thông tin đúng cách
    Object.assign(booking, updateBookingDto);
    return await this.bookingRepository.save(booking);
  }

  async cancel(id: number): Promise<Booking> {
    const booking = await this.findOne(id);

    // ✅ Sử dụng enum để so sánh
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy đặt sân đã hoàn thành');
    }

    booking.status = BookingStatus.CANCELLED;
    return this.bookingRepository.save(booking);
  }

  // Kiểm tra khung giờ có khả dụng không
  async checkAvailability(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    // Lấy danh sách court ID liên quan (sân cha/con nếu có)
    const relatedCourtIds = await this.getRelatedCourts(courtId);

    // ✅ Sử dụng enum cho status filter
    const existingBookings = await this.bookingRepository.find({
      where: {
        court_id: In(relatedCourtIds),
        date: date,
        status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
      },
    });

    // Kiểm tra từng booking có xung đột thời gian không
    for (const booking of existingBookings) {
      // Chuyển đổi string time thành số giờ để so sánh dễ dàng hơn
      const bookingStart = parseInt(booking.start_time.split(':')[0]);
      const bookingEnd = parseInt(booking.end_time.split(':')[0]);
      const newStart = parseInt(startTime.split(':')[0]);
      const newEnd = parseInt(endTime.split(':')[0]);

      // Kiểm tra xung đột
      if (
        (newStart >= bookingStart && newStart < bookingEnd) || // Giờ bắt đầu mới nằm trong booking cũ
        (newEnd > bookingStart && newEnd <= bookingEnd) || // Giờ kết thúc mới nằm trong booking cũ
        (newStart <= bookingStart && newEnd >= bookingEnd) // Booking mới bao trọn booking cũ
      ) {
        return false; // Có xung đột thời gian
      }
    }

    return true; // Không có xung đột, khung giờ có sẵn
  }

  // Lấy danh sách sân liên quan (sân cha/con)
  private async getRelatedCourts(courtId: number): Promise<number[]> {
    // Tìm tất cả các court mapping liên quan
    const mappings = await this.courtMappingRepository.find({
      where: [{ parent_court_id: courtId }, { child_court_id: courtId }],
    });

    // Tập hợp tất cả court_id liên quan
    const relatedCourtIds = new Set<number>([courtId]);

    mappings.forEach((mapping) => {
      relatedCourtIds.add(mapping.parent_court_id);
      relatedCourtIds.add(mapping.child_court_id);
    });

    return Array.from(relatedCourtIds);
  }

  // Thêm phương thức này vào class BookingService
  async getStats(): Promise<
    BookingStatsDto & { venueCounts: Record<number, number> }
  > {
    try {
      // Đếm tổng số đặt sân
      const totalBookings = await this.bookingRepository.count();

      // ✅ Sử dụng enum cho status queries
      const confirmedBookings = await this.bookingRepository.count({
        where: { status: BookingStatus.CONFIRMED },
      });

      const pendingBookings = await this.bookingRepository.count({
        where: { status: BookingStatus.PENDING },
      });

      const completedBookings = await this.bookingRepository.count({
        where: { status: BookingStatus.COMPLETED },
      });

      const cancelledBookings = await this.bookingRepository.count({
        where: { status: BookingStatus.CANCELLED },
      });

      // ✅ Tính todayBookings - số booking có ngày chơi là hôm nay (dựa trên field date)
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const todayBookings = await this.bookingRepository.count({
        where: {
          date: today,
          status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        },
      });

      // ✅ Tính todayBookingsCreated - số booking được tạo hôm nay (dựa trên created_at)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayBookingsCreated = await this.bookingRepository
        .createQueryBuilder('booking')
        .where(
          'booking.created_at >= :startOfDay AND booking.created_at <= :endOfDay',
          {
            startOfDay,
            endOfDay,
          },
        )
        .getCount();

      // Thêm code để lấy số lượng booking theo venue
      const venueBookingsQuery = await this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoin('booking.court', 'court')
        .select('court.venue_id', 'venue_id')
        .addSelect('COUNT(booking.booking_id)', 'count')
        .where('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        })
        .groupBy('court.venue_id')
        .getRawMany();

      // Định nghĩa interface cho kết quả từ raw query
      interface VenueBookingCount {
        venue_id: number;
        count: string;
      }

      // Chuyển đổi kết quả thành object { venue_id: count }
      const venueCounts: Record<number, number> = {};
      (venueBookingsQuery as VenueBookingCount[]).forEach((item) => {
        venueCounts[item.venue_id] = parseInt(item.count, 10);
      });

      return {
        totalBookings,
        todayBookings,
        todayBookingsCreated,
        confirmedBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        venueCounts,
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      // Trả về giá trị mặc định đầy đủ các trường khi có lỗi
      return {
        totalBookings: 0,
        todayBookings: 0,
        todayBookingsCreated: 0,
        confirmedBookings: 0,
        pendingBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        venueCounts: {},
      };
    }
  }

  // ✅ Helper method để convert string to BookingStatus enum
  private mapStringToBookingStatus(status: string): BookingStatus | null {
    switch (status.toLowerCase()) {
      case 'pending':
        return BookingStatus.PENDING;
      case 'confirmed':
        return BookingStatus.CONFIRMED;
      case 'completed':
        return BookingStatus.COMPLETED;
      case 'cancelled':
        return BookingStatus.CANCELLED;
      default:
        return null;
    }
  }

  // ✅ Method để convert BookingStatus enum to string (nếu cần)
  public getBookingStatusString(status: BookingStatus): string {
    return status.toString();
  }

  // ✅ Method để validate BookingStatus
  public isValidBookingStatus(status: string): boolean {
    return Object.values(BookingStatus).includes(status as BookingStatus);
  }

  async updatePaymentStatus(
    bookingId: number,
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded',
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    booking.payment_status = paymentStatus as PaymentStatus;
    return this.bookingRepository.save(booking);
  }
}
