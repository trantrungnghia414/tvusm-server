import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Court } from './entities/court.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import * as fs from 'fs';

// ✅ Interface cho query result để type safety
interface CourtQueryResult {
  court_court_id: number;
  court_name: string;
  court_code: string;
  court_description: string | null;
  court_hourly_rate: string;
  court_status: 'available' | 'booked' | 'maintenance';
  court_is_indoor: boolean;
  court_image: string | null;
  court_court_level: number | null;
  court_venue_id: number;
  court_type_id: number;
  court_created_at: Date;
  court_updated_at: Date;
  venue_name: string;
  courtType_name: string;
}

// ✅ Interface cho response
interface CourtResponse {
  court_id: number;
  name: string;
  code: string;
  description: string | null;
  hourly_rate: number;
  status: 'available' | 'booked' | 'maintenance';
  is_indoor: boolean;
  image: string | null;
  court_level: number | null;
  venue_id: number;
  type_id: number;
  venue_name: string;
  type_name: string;
  created_at: Date;
  updated_at: Date;
}

// ✅ Interface cho booking query result
interface BookingQueryResult {
  start_time: string;
  end_time: string;
  booking_id: number;
  status: string;
  court_id: number; // ✅ Thêm field này
  renter_name?: string;
  renter_phone?: string;
  booking_code?: string;
  created_at?: Date;
  court_name?: string;
  court_code?: string;
}

// ✅ Interface cho time slot
interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking_id: number | null;
  booking_status: string | null;
  conflicting_court_id?: number | null; // ✅ Thêm để biết sân nào gây conflict
}

// ✅ Interface cho availability response
interface AvailabilityResponse {
  date: string;
  slots: TimeSlot[];
}

@Injectable()
export class CourtService {
  constructor(
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
  ) {}

  // Tạo sân mới
  async create(createCourtDto: CreateCourtDto): Promise<Court> {
    try {
      // Kiểm tra trùng lặp mã sân
      const existingCourt = await this.courtRepository.findOne({
        where: { code: createCourtDto.code },
      });

      if (existingCourt) {
        throw new ConflictException(
          `Mã sân "${createCourtDto.code}" đã tồn tại`,
        );
      }

      // ✅ Tạo object court với đúng kiểu dữ liệu
      const courtData = {
        name: createCourtDto.name,
        code: createCourtDto.code,
        description: createCourtDto.description,
        hourly_rate: createCourtDto.hourly_rate,
        status: createCourtDto.status || ('available' as const),
        is_indoor: Boolean(createCourtDto.is_indoor),
        court_level: createCourtDto.court_level || 1,
        venue_id: createCourtDto.venue_id,
        type_id: createCourtDto.type_id,
        image: createCourtDto.image,
      };

      const court = this.courtRepository.create(courtData);
      return await this.courtRepository.save(court);
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

  // Lấy danh sách tất cả sân với thông tin bổ sung
  async findAll(): Promise<CourtResponse[]> {
    try {
      const courts = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.courtType', 'courtType')
        .select([
          'court.court_id',
          'court.name',
          'court.code',
          'court.description',
          'court.hourly_rate',
          'court.status',
          'court.is_indoor',
          'court.image',
          'court.court_level',
          'court.venue_id',
          'court.type_id',
          'court.created_at',
          'court.updated_at',
          'venue.name',
          'courtType.name',
        ])
        .orderBy('court.created_at', 'DESC')
        .getRawMany<CourtQueryResult>();

      // ✅ Map với type safety
      return courts.map(
        (court): CourtResponse => ({
          court_id: court.court_court_id,
          name: court.court_name,
          code: court.court_code,
          description: court.court_description,
          hourly_rate: parseFloat(court.court_hourly_rate),
          status: court.court_status,
          is_indoor: court.court_is_indoor,
          image: court.court_image,
          court_level: court.court_court_level,
          venue_id: court.court_venue_id,
          type_id: court.court_type_id,
          venue_name: court.venue_name,
          type_name: court.courtType_name,
          created_at: court.court_created_at,
          updated_at: court.court_updated_at,
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

  // Lấy chi tiết một sân
  async findOne(id: number): Promise<Court> {
    try {
      const court = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.courtType', 'courtType')
        .where('court.court_id = :id', { id })
        .getOne();

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với ID ${id}`);
      }

      return court;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy thông tin sân: ${errorMessage}`,
      );
    }
  }

  // ✅ Thêm methods findByVenue và findByType để tránh lỗi trong controller
  async findByVenue(venueId: number): Promise<Court[]> {
    try {
      return await this.courtRepository.find({
        where: { venue_id: venueId },
        relations: ['venue', 'courtType'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân theo venue: ${errorMessage}`,
      );
    }
  }

  async findByType(typeId: number): Promise<Court[]> {
    try {
      return await this.courtRepository.find({
        where: { type_id: typeId },
        relations: ['venue', 'courtType'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân theo type: ${errorMessage}`,
      );
    }
  }

  // Cập nhật thông tin sân
  async update(id: number, updateCourtDto: UpdateCourtDto): Promise<Court> {
    try {
      const court = await this.findOne(id);

      // Kiểm tra trùng lặp mã sân nếu có thay đổi
      if (updateCourtDto.code && updateCourtDto.code !== court.code) {
        const existingCourt = await this.courtRepository.findOne({
          where: { code: updateCourtDto.code },
        });

        if (existingCourt) {
          throw new ConflictException(
            `Mã sân "${updateCourtDto.code}" đã tồn tại`,
          );
        }
      }

      // Xóa ảnh cũ nếu có ảnh mới
      if (
        updateCourtDto.image &&
        court.image &&
        court.image !== updateCourtDto.image
      ) {
        try {
          if (
            !court.image.startsWith('http') &&
            fs.existsSync(`.${court.image}`)
          ) {
            fs.unlinkSync(`.${court.image}`);
          }
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh cũ:', error);
        }
      }

      // ✅ Cập nhật từng field một cách rõ ràng
      if (updateCourtDto.name !== undefined) court.name = updateCourtDto.name;
      if (updateCourtDto.code !== undefined) court.code = updateCourtDto.code;
      if (updateCourtDto.description !== undefined)
        court.description = updateCourtDto.description;
      if (updateCourtDto.hourly_rate !== undefined)
        court.hourly_rate = updateCourtDto.hourly_rate;
      if (updateCourtDto.status !== undefined)
        court.status = updateCourtDto.status;
      if (updateCourtDto.is_indoor !== undefined)
        court.is_indoor = Boolean(updateCourtDto.is_indoor);
      if (updateCourtDto.court_level !== undefined)
        court.court_level = updateCourtDto.court_level;
      if (updateCourtDto.venue_id !== undefined)
        court.venue_id = updateCourtDto.venue_id;
      if (updateCourtDto.type_id !== undefined)
        court.type_id = updateCourtDto.type_id;
      if (updateCourtDto.image !== undefined)
        court.image = updateCourtDto.image;

      return await this.courtRepository.save(court);
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

  // Xóa sân
  async remove(id: number): Promise<void> {
    try {
      const court = await this.findOne(id);

      // Xóa file ảnh nếu có
      if (court.image && !court.image.startsWith('http')) {
        try {
          if (fs.existsSync(`.${court.image}`)) {
            fs.unlinkSync(`.${court.image}`);
          }
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

  // Cập nhật trạng thái sân
  async updateStatus(
    id: number,
    status: 'available' | 'booked' | 'maintenance',
  ): Promise<Court> {
    try {
      const court = await this.findOne(id);
      court.status = status;
      return await this.courtRepository.save(court);
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

  // ✅ SỬA LỖI: Method getCourtAvailability với logic court mapping
  async getCourtAvailability(
    courtId: number,
    date: string,
  ): Promise<AvailabilityResponse[]> {
    try {
      console.log(`🔍 Getting availability for court ${courtId} on ${date}`);

      // ✅ Kiểm tra court có tồn tại
      const court = await this.courtRepository.findOne({
        where: { court_id: courtId },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với ID ${courtId}`);
      }

      // ✅ Lấy danh sách sân liên quan (sân cha/con) từ court mapping
      const relatedCourts = await this.getRelatedCourts(courtId);
      console.log(`📊 Related courts for court ${courtId}:`, relatedCourts);

      // ✅ Query bookings cho TẤT CẢ sân liên quan
      const query = `
        SELECT 
          b.start_time, 
          b.end_time, 
          b.booking_id, 
          b.status,
          b.court_id,
          b.renter_name,
          b.renter_phone,
          b.booking_code,
          b.created_at,
          c.name as court_name,
          c.code as court_code
        FROM bookings b
        LEFT JOIN courts c ON b.court_id = c.court_id
        WHERE b.court_id IN (${relatedCourts.map(() => '?').join(',')})
        AND DATE(b.date) = DATE(?)
        AND b.status IN ('confirmed', 'completed', 'pending')
        ORDER BY b.start_time
      `;

      console.log(`📋 Executing query:`, query);
      console.log(
        `📋 Parameters: courts=[${relatedCourts.join(',')}], date=${date}`,
      );

      const rawResults: unknown = await this.courtRepository.manager.query(
        query,
        [...relatedCourts, date],
      );

      console.log(`📊 Raw booking results:`, rawResults);

      // ✅ Type guard với proper validation
      const isValidBookingResult = (
        obj: unknown,
      ): obj is BookingQueryResult => {
        if (typeof obj !== 'object' || obj === null) {
          return false;
        }

        const candidate = obj as Record<string, unknown>;
        return (
          'start_time' in candidate &&
          'end_time' in candidate &&
          'booking_id' in candidate &&
          'status' in candidate &&
          'court_id' in candidate &&
          typeof candidate.start_time === 'string' &&
          typeof candidate.end_time === 'string' &&
          typeof candidate.booking_id === 'number' &&
          typeof candidate.status === 'string' &&
          typeof candidate.court_id === 'number'
        );
      };

      const validBookings: BookingQueryResult[] = Array.isArray(rawResults)
        ? rawResults.filter(isValidBookingResult)
        : [];

      console.log(`✅ Valid bookings found: ${validBookings.length}`);
      validBookings.forEach((booking) => {
        console.log(
          `📅 Booking ${booking.booking_id}: Court ${booking.court_id} - ${booking.start_time}-${booking.end_time} (${booking.status})`,
        );
      });

      // ✅ Tạo time slots với logic kiểm tra booking + court mapping
      const slots: TimeSlot[] = [];
      const now = new Date();
      const selectedDateObj = new Date(date);
      const isToday =
        selectedDateObj.getDate() === now.getDate() &&
        selectedDateObj.getMonth() === now.getMonth() &&
        selectedDateObj.getFullYear() === now.getFullYear();

      console.log(
        `📅 Date info: selectedDate=${date}, isToday=${isToday}, currentTime=${now.getHours()}:${now.getMinutes()}`,
      );

      // ✅ Tạo slots từ 6:00 đến 22:00 (16 slots)
      for (let hour = 6; hour < 22; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

        // ✅ Kiểm tra xem slot này có bị booking nào chiếm không (bất kỳ sân liên quan nào)
        const conflictingBooking = validBookings.find((booking) => {
          const bookingStartHour = parseInt(booking.start_time.split(':')[0]);
          const bookingEndHour = parseInt(booking.end_time.split(':')[0]);

          // Slot bị chiếm nếu hour nằm trong khoảng [bookingStart, bookingEnd)
          const isOccupied = hour >= bookingStartHour && hour < bookingEndHour;

          if (isOccupied) {
            console.log(
              `🔴 Slot ${startTime}-${endTime} is OCCUPIED by booking ${booking.booking_id} on court ${booking.court_id} (${booking.start_time}-${booking.end_time})`,
            );
          }

          return isOccupied;
        });

        // ✅ SỬA LỖI: Logic kiểm tra isPastTime chính xác
        let isPastTime = false;
        if (isToday) {
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          const slotEndHour = hour + 1;

          if (slotEndHour <= currentHour) {
            // Slot đã kết thúc hoàn toàn
            isPastTime = true;
          } else if (hour <= currentHour && currentMinute >= 30) {
            // Slot đang diễn ra nhưng đã qua 30 phút
            isPastTime = true;
          }
        }

        // ✅ Slot available khi: KHÔNG có booking (trên bất kỳ sân liên quan nào) + CHƯA qua giờ
        const isAvailable = !conflictingBooking && !isPastTime;

        slots.push({
          start_time: startTime,
          end_time: endTime,
          is_available: isAvailable,
          booking_id: conflictingBooking?.booking_id || null,
          booking_status: conflictingBooking?.status || null,
          // ✅ Thêm thông tin sân gây conflict (để debug)
          conflicting_court_id: conflictingBooking?.court_id || null,
        });

        // ✅ Debug log chi tiết
        console.log(
          `⏰ Slot ${startTime}-${endTime}: available=${isAvailable}, hasBooking=${!!conflictingBooking}, past=${isPastTime}, bookingId=${conflictingBooking?.booking_id || 'none'}, conflictCourt=${conflictingBooking?.court_id || 'none'}`,
        );
      }

      const result: AvailabilityResponse[] = [
        {
          date: date,
          slots: slots,
        },
      ];

      console.log(`✅ Final result for court ${courtId} on ${date}:`);
      console.log(`   - Total slots: ${result[0].slots.length}`);
      console.log(
        `   - Available slots: ${result[0].slots.filter((s) => s.is_available).length}`,
      );
      console.log(
        `   - Booked slots: ${result[0].slots.filter((s) => !s.is_available && s.booking_id).length}`,
      );
      console.log(
        `   - Past slots: ${result[0].slots.filter((s) => !s.is_available && !s.booking_id).length}`,
      );

      return result;
    } catch (error) {
      console.error('❌ Error in getCourtAvailability service:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Không thể lấy thông tin lịch đặt sân: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
    }
  }

  // ✅ THÊM METHOD: Lấy danh sách sân liên quan (sân cha/con)
  private async getRelatedCourts(courtId: number): Promise<number[]> {
    try {
      // ✅ Định nghĩa interface cho court mapping result
      interface CourtMappingResult {
        parent_court_id: number;
        child_court_id: number;
      }

      // Tìm tất cả các court mapping liên quan đến sân này
      const rawMappings: unknown = await this.courtRepository.manager.query(
        `
        SELECT parent_court_id, child_court_id 
        FROM court_mappings 
        WHERE parent_court_id = ? OR child_court_id = ?
      `,
        [courtId, courtId],
      );

      console.log(`🔗 Court mappings for court ${courtId}:`, rawMappings);

      // ✅ Type guard để validate dữ liệu
      const isValidMappingResult = (
        obj: unknown,
      ): obj is CourtMappingResult => {
        if (typeof obj !== 'object' || obj === null) {
          return false;
        }

        const candidate = obj as Record<string, unknown>;
        return (
          'parent_court_id' in candidate &&
          'child_court_id' in candidate &&
          typeof candidate.parent_court_id === 'number' &&
          typeof candidate.child_court_id === 'number'
        );
      };

      // ✅ Filter và validate mappings
      const mappings: CourtMappingResult[] = Array.isArray(rawMappings)
        ? rawMappings.filter(isValidMappingResult)
        : [];

      console.log(`🔗 Valid court mappings for court ${courtId}:`, mappings);

      // Tập hợp tất cả court_id liên quan
      const relatedCourtIds = new Set<number>([courtId]);

      // ✅ Sử dụng typed mappings để tránh unsafe member access
      mappings.forEach((mapping: CourtMappingResult) => {
        relatedCourtIds.add(mapping.parent_court_id);
        relatedCourtIds.add(mapping.child_court_id);
      });

      const result = Array.from(relatedCourtIds);
      console.log(`🔗 All related courts for court ${courtId}:`, result);

      return result;
    } catch (error) {
      console.error('❌ Error getting related courts:', error);
      // Nếu có lỗi, chỉ trả về sân hiện tại
      return [courtId];
    }
  }

  // ✅ Helper method với type safety
  private generateMockAvailability(date: string): AvailabilityResponse[] {
    const slots: TimeSlot[] = [];

    // Tạo slots từ 6:00 đến 22:00
    for (let hour = 6; hour < 22; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

      // Random availability (70% có thể đặt)
      const isAvailable = Math.random() > 0.3;

      slots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable,
        booking_id: isAvailable ? null : Math.floor(Math.random() * 1000) + 1,
        booking_status: isAvailable ? null : 'confirmed',
      });
    }

    return [
      {
        date: date,
        slots: slots,
      },
    ];
  }
}
