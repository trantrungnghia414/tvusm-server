import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Court } from '../court/entities/court.entity';
import { CourtMapping } from '../court-mapping/entities/court-mapping.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatsDto } from './dto/stats.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(CourtMapping)
    private courtMappingRepository: Repository<CourtMapping>,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    try {
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

      // Kiểm tra thời gian hợp lệ
      const startTime = createBookingDto.start_time;
      const endTime = createBookingDto.end_time;

      if (startTime >= endTime) {
        throw new BadRequestException(
          'Thời gian bắt đầu phải trước thời gian kết thúc',
        );
      }

      // Kiểm tra thời gian đặt sân có bị trùng không
      const isTimeSlotAvailable = await this.checkAvailability(
        createBookingDto.court_id,
        createBookingDto.date,
        startTime,
        endTime,
      );

      if (!isTimeSlotAvailable) {
        throw new ConflictException(
          'Khung giờ này đã được đặt, vui lòng chọn khung giờ khác',
        );
      }

      // Tính tổng tiền dựa trên số giờ và giá sân
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      const duration = endHour - startHour;
      const totalAmount = court.hourly_rate * duration;

      // Tạo đơn đặt sân mới
      const newBooking = this.bookingRepository.create({
        ...createBookingDto,
        booking_date: createBookingDto.date, // Đảm bảo có cả booking_date và date
        date: createBookingDto.date,
        total_amount: totalAmount, // Sử dụng total_amount thay vì total_price
        status: 'confirmed', // Mặc định là confirmed
        booking_code: `BK${Math.floor(Math.random() * 1000000)}`, // Thêm booking_code bắt buộc
        booking_type: 'public', // Thêm booking_type bắt buộc
        payment_status: 'unpaid', // Thêm payment_status mặc định
      });

      // Lưu vào cơ sở dữ liệu
      return await this.bookingRepository.save(newBooking);
    } catch (error) {
      // Xử lý lỗi
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Không thể tạo đặt sân: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
    }
  }

  async findAll(
    status?: string,
    date?: string,
    courtId?: number,
  ): Promise<Booking[]> {
    const queryOptions: FindManyOptions<Booking> = {
      relations: ['court'],
      order: { created_at: 'DESC' },
    };

    // Khởi tạo đối tượng where nếu có điều kiện
    const whereClause: FindOptionsWhere<Booking> = {};

    // Thêm các điều kiện tìm kiếm nếu có
    if (status) {
      whereClause.status = status;
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
      relations: ['court', 'court.venue'],
      order: { created_at: 'DESC' },
    });
  }

  async update(
    id: number,
    updateBookingDto: UpdateBookingDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Không cho phép thay đổi sân, ngày và giờ của booking đã xác nhận
    if (
      booking.status !== 'pending' &&
      (updateBookingDto.court_id ||
        updateBookingDto.date ||
        updateBookingDto.start_time ||
        updateBookingDto.end_time)
    ) {
      throw new BadRequestException(
        'Không thể thay đổi sân, ngày hoặc giờ của đặt sân đã xác nhận',
      );
    }

    // Cập nhật thông tin
    const updatedBooking = { ...booking, ...updateBookingDto };
    return this.bookingRepository.save(updatedBooking);
  }

  async cancel(id: number): Promise<Booking> {
    const booking = await this.findOne(id);

    // Kiểm tra nếu đặt sân đã kết thúc thì không thể hủy
    if (booking.status === 'completed') {
      throw new BadRequestException('Không thể hủy đặt sân đã hoàn thành');
    }

    booking.status = 'cancelled';
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

    // Kiểm tra có đơn đặt sân nào trong các sân liên quan có thời gian trùng không
    const existingBookings = await this.bookingRepository.find({
      where: {
        court_id: In(relatedCourtIds),
        date: date,
        status: In(['confirmed', 'pending']),
        // Một trong các điều kiện sau đây sẽ gây xung đột:
        // 1. StartTime của booking mới nằm trong khoảng thời gian của booking cũ
        // 2. EndTime của booking mới nằm trong khoảng thời gian của booking cũ
        // 3. Booking mới bao trọn booking cũ
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
  async getStats(): Promise<BookingStatsDto> {
    try {
      // Đếm tổng số đặt sân
      const totalBookings = await this.bookingRepository.count();

      // Đếm số đặt sân theo từng trạng thái
      const confirmedBookings = await this.bookingRepository.count({
        where: { status: 'confirmed' },
      });

      const pendingBookings = await this.bookingRepository.count({
        where: { status: 'pending' },
      });

      const completedBookings = await this.bookingRepository.count({
        where: { status: 'completed' },
      });

      const cancelledBookings = await this.bookingRepository.count({
        where: { status: 'cancelled' },
      });

      return {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      return { totalBookings: 0 }; // Trả về giá trị mặc định nếu có lỗi
    }
  }
}
