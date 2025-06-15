import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, In } from 'typeorm';
import * as fs from 'fs';
import { Court } from './entities/court.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import {
  CourtQueryResult,
  CourtResponse,
} from './interfaces/court-query-result.interface';
import { Booking } from '../booking/entities/booking.entity';
import { CourtMapping } from '../court-mapping/entities/court-mapping.entity';
import {
  AvailabilitySlotDto,
  DayAvailabilityDto,
} from './dto/court-availability.dto';

@Injectable()
export class CourtService {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,

    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,

    @InjectRepository(CourtMapping)
    private readonly courtMappingRepository: Repository<CourtMapping>,
  ) {}

  async create(createCourtDto: CreateCourtDto): Promise<Court> {
    try {
      // Kiểm tra mã code đã tồn tại chưa
      const existingCourt = await this.courtRepository.findOne({
        where: { code: createCourtDto.code },
      });

      if (existingCourt) {
        throw new ConflictException(
          `Mã sân '${createCourtDto.code}' đã tồn tại`,
        );
      }

      // Thực hiện chuyển đổi dữ liệu từ DTO sang entity
      const courtData: DeepPartial<Court> = {
        ...createCourtDto,
        is_indoor: createCourtDto.is_indoor === 1,
      };

      const newCourt = this.courtRepository.create(courtData);
      return this.courtRepository.save(newCourt);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể tạo sân: ${errorMessage}`,
      );
    }
  }

  async findAll(): Promise<CourtResponse[]> {
    try {
      // Định nghĩa kiểu dữ liệu cho kết quả của raw query
      interface RawCourt {
        court_id: number;
        name: string;
        code: string;
        description: string | null;
        hourly_rate: number;
        status: 'available' | 'booked' | 'maintenance';
        image: string | null;
        is_indoor: boolean | number; // Có thể là boolean hoặc số (0/1)
        venue_id: number;
        type_id: number;
        created_at: string | Date;
        updated_at: string | Date | null;
        venue_name: string;
        type_name: string;
        booking_count: string | number; // Count thường trả về dưới dạng string
      }

      // Sử dụng raw query không cần chỉ định kiểu dữ liệu generic
      const courts = (await this.courtRepository.query(`
        SELECT c.*, v.name as venue_name, t.name as type_name, 
               COUNT(b.booking_id) as booking_count
        FROM courts c
        LEFT JOIN venues v ON c.venue_id = v.venue_id
        LEFT JOIN court_types t ON c.type_id = t.type_id
        LEFT JOIN bookings b ON c.court_id = b.court_id AND b.status IN ('confirmed', 'completed')
        GROUP BY c.court_id
        ORDER BY c.created_at DESC
      `)) as RawCourt[];

      return courts.map(
        (court): CourtResponse => ({
          court_id: court.court_id,
          name: court.name,
          code: court.code,
          description: court.description,
          hourly_rate: court.hourly_rate,
          status: court.status,
          image: court.image,
          is_indoor: Boolean(court.is_indoor),
          created_at: new Date(court.created_at),
          updated_at: court.updated_at ? new Date(court.updated_at) : undefined,
          venue_id: court.venue_id,
          type_id: court.type_id,
          venue_name: court.venue_name,
          type_name: court.type_name,
          booking_count: parseInt(String(court.booking_count || '0'), 10),
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân: ${errorMessage}`,
      );
    }
  }

  async findOne(id: number): Promise<CourtResponse> {
    try {
      // Sử dụng kiểu đã định nghĩa cho kết quả truy vấn
      const courts = (await this.courtRepository.query(
        `
        SELECT c.*, v.name as venue_name, t.name as type_name, 
               COUNT(b.booking_id) as booking_count
        FROM courts c
        LEFT JOIN venues v ON c.venue_id = v.venue_id
        LEFT JOIN court_types t ON c.type_id = t.type_id
        LEFT JOIN bookings b ON c.court_id = b.court_id AND b.status IN ('confirmed', 'completed')
        WHERE c.court_id = ?
        GROUP BY c.court_id
      `,
        [id],
      )) as CourtQueryResult[];

      if (courts.length === 0) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      // Sử dụng kết quả đã có kiểu cụ thể
      const court = courts[0];
      const name = court.name;
      const code = court.code;
      const description = court.description;
      const hourlyRate = Number(court.hourly_rate);
      const status = court.status;
      const image = court.image;
      const isIndoor = Boolean(court.is_indoor);
      const createdAt = new Date(court.created_at);
      const updatedAt = court.updated_at
        ? new Date(court.updated_at)
        : undefined;
      const venueId = court.venue_id;
      const typeId = court.type_id;
      const venueName = court.venue_name;
      const typeName = court.type_name;
      const bookingCount = parseInt(String(court.booking_count || '0'), 10);

      return {
        court_id: id,
        name,
        code,
        description,
        hourly_rate: hourlyRate,
        status,
        image,
        is_indoor: isIndoor,
        created_at: createdAt,
        updated_at: updatedAt,
        venue_id: venueId,
        type_id: typeId,
        venue_name: venueName,
        type_name: typeName,
        booking_count: bookingCount,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy thông tin sân với id ${id}: ${errorMessage}`,
      );
    }
  }

  async update(id: number, updateCourtDto: UpdateCourtDto): Promise<Court> {
    try {
      const court = await this.courtRepository.findOne({
        where: { court_id: id },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      // Kiểm tra code mới nếu được cung cấp
      if (updateCourtDto.code && updateCourtDto.code !== court.code) {
        const existingCourt = await this.courtRepository.findOne({
          where: { code: updateCourtDto.code },
        });

        if (existingCourt) {
          throw new ConflictException(
            `Mã sân '${updateCourtDto.code}' đã tồn tại`,
          );
        }
      }

      // Xử lý xóa ảnh cũ nếu có ảnh mới
      if (updateCourtDto.image && court.image) {
        try {
          if (
            court.image &&
            !court.image.startsWith('http') &&
            fs.existsSync(`.${court.image}`)
          ) {
            fs.unlinkSync(`.${court.image}`);
          }
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh cũ:', error);
        }
      }

      Object.assign(court, updateCourtDto);
      return this.courtRepository.save(court);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể cập nhật sân: ${errorMessage}`,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const court = await this.courtRepository.findOne({
        where: { court_id: id },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      // Xóa file ảnh nếu có
      if (
        court.image &&
        !court.image.startsWith('http') &&
        fs.existsSync(`.${court.image}`)
      ) {
        try {
          fs.unlinkSync(`.${court.image}`);
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh:', error);
        }
      }

      await this.courtRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể xóa sân: ${errorMessage}`,
      );
    }
  }

  async updateStatus(
    id: number,
    status: 'available' | 'booked' | 'maintenance',
  ): Promise<Court> {
    try {
      const court = await this.courtRepository.findOne({
        where: { court_id: id },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      court.status = status;
      return this.courtRepository.save(court);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể cập nhật trạng thái sân: ${errorMessage}`,
      );
    }
  }

  async findByVenue(venueId: number): Promise<CourtResponse[]> {
    try {
      const courts = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.type', 'type')
        .where('court.venue_id = :venueId', { venueId })
        .select([
          'court.*',
          'venue.name AS venue_name',
          'type.name AS type_name',
        ])
        .getRawMany<CourtQueryResult>();

      if (!courts || courts.length === 0) {
        return [];
      }

      return courts.map(
        (court: CourtQueryResult): CourtResponse => ({
          court_id: court.court_id,
          name: court.name,
          code: court.code,
          hourly_rate: court.hourly_rate,
          description: court.description,
          status: court.status,
          image: court.image,
          is_indoor: court.is_indoor,
          created_at: court.created_at,
          updated_at: court.updated_at,
          venue_id: court.venue_id,
          type_id: court.type_id,
          venue_name: court.venue_name,
          type_name: court.type_name,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân theo nhà thi đấu: ${errorMessage}`,
      );
    }
  }

  async findByType(typeId: number): Promise<CourtResponse[]> {
    try {
      const courts = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.type', 'type')
        .where('court.type_id = :typeId', { typeId })
        .select([
          'court.*',
          'venue.name AS venue_name',
          'type.name AS type_name',
        ])
        .getRawMany<CourtQueryResult>();

      if (!courts || courts.length === 0) {
        return [];
      }

      return courts.map(
        (court: CourtQueryResult): CourtResponse => ({
          court_id: court.court_id,
          name: court.name,
          code: court.code,
          hourly_rate: court.hourly_rate,
          description: court.description,
          status: court.status,
          image: court.image,
          is_indoor: court.is_indoor,
          created_at: court.created_at,
          updated_at: court.updated_at,
          venue_id: court.venue_id,
          type_id: court.type_id,
          venue_name: court.venue_name,
          type_name: court.type_name,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân theo loại sân: ${errorMessage}`,
      );
    }
  }

  async getCourtAvailability(
    courtId: number,
    date: string,
  ): Promise<DayAvailabilityDto[]> {
    try {
      // Kiểm tra sân có tồn tại không
      const court = await this.courtRepository.findOneBy({ court_id: courtId });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${courtId}`);
      }

      // Khởi tạo danh sách khung giờ mặc định từ 6:00 đến 22:00
      const openingHour = 6; // 6 AM
      const closingHour = 22; // 10 PM
      const slots: AvailabilitySlotDto[] = [];

      // Nếu không thể lấy được bookings, vẫn tạo ra danh sách slots mặc định
      // với tất cả các slots là available
      for (let hour = openingHour; hour < closingHour; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

        slots.push({
          start_time: startTime,
          end_time: endTime,
          is_available: true,
        });
      }

      // Tạo đối tượng phản hồi mặc định
      const defaultAvailability: DayAvailabilityDto = {
        date: date,
        slots: slots,
      };

      try {
        // Thử lấy danh sách sân liên quan (sân cha/con)
        const relatedCourtIds = await this.getRelatedCourts(courtId);

        // Lấy tất cả đơn đặt sân cho ngày chỉ định
        const bookings = await this.bookingRepository.find({
          where: {
            court_id: In(relatedCourtIds),
            date: date,
            status: In(['confirmed', 'pending']), // Chỉ lấy các đơn chưa bị hủy
          },
          select: [
            'booking_id',
            'court_id',
            'start_time',
            'end_time',
            'status',
          ],
        });

        // Đánh dấu các slot đã được đặt
        for (const slot of slots) {
          const startHour = parseInt(slot.start_time.split(':')[0]);
          const conflictingBooking = bookings.find((booking) => {
            const bookingStart = parseInt(booking.start_time.split(':')[0]);
            const bookingEnd = parseInt(booking.end_time.split(':')[0]);

            return startHour >= bookingStart && startHour < bookingEnd;
          });

          if (conflictingBooking) {
            slot.is_available = false;
            slot.booking_id = conflictingBooking.booking_id;
          }
        }

        return [defaultAvailability];
      } catch (err) {
        console.warn('Không thể lấy dữ liệu bookings:', err);
        // Nếu có lỗi khi xử lý bookings, vẫn trả về availability mặc định
        return [defaultAvailability];
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching court availability:', error);

      // Trả về dữ liệu mẫu trong môi trường dev để tránh lỗi 500
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockAvailability(date);
      }

      throw new InternalServerErrorException(
        'Không thể lấy thông tin lịch đặt sân',
      );
    }
  }

  // Thêm phương thức tạo dữ liệu mẫu
  private generateMockAvailability(date: string): DayAvailabilityDto[] {
    const openingHour = 6; // 6 AM
    const closingHour = 22; // 10 PM
    const slots: AvailabilitySlotDto[] = [];

    for (let hour = openingHour; hour < closingHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

      // 70% khả năng slot sẽ trống
      const isAvailable = Math.random() > 0.3;

      slots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable,
        booking_id: isAvailable
          ? undefined
          : Math.floor(Math.random() * 1000) + 1,
      });
    }

    return [
      {
        date: date,
        slots: slots,
      },
    ];
  }

  // Phương thức helper để lấy danh sách sân liên quan
  private async getRelatedCourts(courtId: number): Promise<number[]> {
    try {
      // Lấy các court mapping từ database
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
    } catch (error) {
      console.error('Error fetching related courts:', error);
      return [courtId];
    }
  }
}
