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
  Request,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { BookingStatsDto } from './dto/stats.dto';

interface RequestWithUser extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ✅ Tạo đặt sân mới - YÊU CẦU ĐĂNG NHẬP
  @Post()
  @UseGuards(JwtAuthGuard) // ✅ Bỏ @Public(), thêm JwtAuthGuard
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // ✅ Đảm bảo user đã đăng nhập
      if (!req.user || !req.user.user_id) {
        throw new HttpException(
          'Bạn cần đăng nhập để đặt sân',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const userId = req.user.user_id;
      console.log('🔐 User đã đăng nhập đặt sân:', userId);

      // ✅ Gọi service với userId (bắt buộc)
      const booking = await this.bookingService.create(
        createBookingDto,
        userId,
      );

      return {
        message: 'Đặt sân thành công',
        booking,
      };
    } catch (error) {
      console.error('❌ Error in booking controller:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi đặt sân';

      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  // Lấy danh sách đặt sân của người dùng hiện tại
  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  findMyBookings(@Request() req: RequestWithUser) {
    return this.bookingService.findBookingsByUserId(req.user!.user_id);
  }

  // Lấy thống kê đặt sân (cho phép truy cập công khai)
  @Get('stats')
  @Public()
  async getStats(): Promise<BookingStatsDto> {
    return this.bookingService.getStats();
  }

  // Lấy tất cả đặt sân (chỉ admin và manager)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  findAll(
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('court_id') courtId?: number,
  ) {
    return this.bookingService.findAll(status, date, courtId);
  }

  // Lấy chi tiết một đặt sân
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    const booking = await this.bookingService.findOne(id);

    // Chỉ cho phép admin/manager hoặc chủ booking xem thông tin
    if (
      req.user!.role === 'admin' ||
      req.user!.role === 'manager' ||
      booking.user_id === req.user!.user_id
    ) {
      return booking;
    }
    throw new HttpException('Không có quyền truy cập', HttpStatus.FORBIDDEN);
  }

  // Cập nhật trạng thái đặt sân
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.update(id, updateBookingDto);
  }

  // Hủy đặt sân
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    const booking = await this.bookingService.findOne(id);

    // Chỉ cho phép admin/manager hoặc chủ booking hủy
    if (
      req.user!.role === 'admin' ||
      req.user!.role === 'manager' ||
      booking.user_id === req.user!.user_id
    ) {
      return this.bookingService.cancel(id);
    }
    throw new HttpException('Không có quyền truy cập', HttpStatus.FORBIDDEN);
  }
}
