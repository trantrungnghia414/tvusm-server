import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourtService } from './court.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

// ✅ Interface cho availability slot
interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking_id?: number;
}

// ✅ Interface cho mock availability response
interface MockAvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
}

// ✅ Interface cho court response - copy từ service để tránh lỗi export
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
  booking_count?: number; // Thêm field booking_count
  created_at: Date;
  updated_at: Date;
}

// ✅ Type guard để check unknown value
function isStringValue(value: unknown): value is string {
  return typeof value === 'string';
}

// ✅ Type guard để check number value
function isNumberValue(value: unknown): value is number {
  return typeof value === 'number';
}

// ✅ Type guard để check boolean value
function isBooleanValue(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// ✅ SỬA LỖI: Helper function để convert is_indoor safely
function convertIsIndoorValue(value: unknown): boolean {
  if (isStringValue(value)) {
    const lowerValue = value.toLowerCase();
    return !(
      lowerValue === 'false' ||
      lowerValue === '0' ||
      lowerValue === 'outdoor' ||
      lowerValue === ''
    );
  } else if (isNumberValue(value)) {
    return value !== 0;
  } else if (isBooleanValue(value)) {
    return value;
  }

  // Default to true if can't determine
  return true;
}

@Controller('courts')
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/courts',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh: jpg, jpeg, png, gif',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async create(
    @Body() createCourtDto: CreateCourtDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      createCourtDto.image = `/uploads/courts/${file.filename}`;
    }

    // ✅ SỬA LỖI: Safe handling cho is_indoor
    if (createCourtDto.is_indoor !== undefined) {
      createCourtDto.is_indoor = convertIsIndoorValue(createCourtDto.is_indoor)
        ? 1
        : 0;
    }

    return this.courtService.create(createCourtDto);
  }

  @Get()
  @Public()
  findAll(): Promise<CourtResponse[]> {
    return this.courtService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.findOne(id);
  }

  @Get('venue/:id')
  @Public()
  findByVenue(@Param('id', ParseIntPipe) venueId: number) {
    return this.courtService.findByVenue(venueId);
  }

  @Get('type/:id')
  @Public()
  findByType(@Param('id', ParseIntPipe) typeId: number) {
    return this.courtService.findByType(typeId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/courts',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh: jpg, jpeg, png, gif',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourtDto: UpdateCourtDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      updateCourtDto.image = `/uploads/courts/${file.filename}`;
    }

    // ✅ SỬA LỖI: Safe handling cho is_indoor
    if (updateCourtDto.is_indoor !== undefined) {
      updateCourtDto.is_indoor = convertIsIndoorValue(updateCourtDto.is_indoor)
        ? 1
        : 0;
    }

    return this.courtService.update(id, updateCourtDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'available' | 'booked' | 'maintenance',
  ) {
    return this.courtService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.remove(id);
  }

  // ✅ SỬA LỖI: Explicit return type với interface local
  @Get(':id/availability')
  @Public()
  async getCourtAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
  ): Promise<MockAvailabilityResponse[]> {
    try {
      const result = await this.courtService.getCourtAvailability(id, date);

      // ✅ Convert từ service response sang controller response format
      return result.map((item) => ({
        date: item.date,
        slots: item.slots.map((slot) => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available,
          booking_id: slot.booking_id || undefined,
        })),
      }));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Trong môi trường development, trả về dữ liệu mẫu khi có lỗi
      if (process.env.NODE_ENV === 'development') {
        console.warn('Fallback to mock data for court availability');
        return this.generateMockAvailability(date);
      }

      throw error;
    }
  }

  // ✅ SỬA LỖI: Helper method với type safety hoàn chỉnh
  private generateMockAvailability(date: string): MockAvailabilityResponse[] {
    const openingHour = 6; // 6 AM
    const closingHour = 22; // 10 PM

    // ✅ Sử dụng interface đã định nghĩa
    const slots: AvailabilitySlot[] = [];

    for (let hour = openingHour; hour < closingHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

      // 70% khả năng slot sẽ trống
      const isAvailable = Math.random() > 0.3;

      const slot: AvailabilitySlot = {
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable,
      };

      // ✅ Chỉ thêm booking_id nếu slot không available
      if (!isAvailable) {
        slot.booking_id = Math.floor(Math.random() * 1000) + 1;
      }

      slots.push(slot);
    }

    const response: MockAvailabilityResponse[] = [
      {
        date: date,
        slots: slots,
      },
    ];

    return response;
  }
}
