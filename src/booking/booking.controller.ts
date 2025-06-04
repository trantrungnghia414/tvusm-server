import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  Request,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateBookingDto } from 'src/booking/dto/update-booking.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Booking } from './entities/booking.entity';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Tạo đặt sân mới (cho phép truy cập public)
  @Post()
  @Public()
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req: RequestWithUser,
  ): Promise<Booking> {
    try {
      // Nếu người dùng đã đăng nhập, lấy user_id từ token
      if (req.user) {
        createBookingDto.user_id = req.user.user_id; // Sửa từ userId thành user_id
      }

      // Xử lý trường hợp có nhiều khung giờ (từ selected_times)
      if (createBookingDto.selected_times) {
        const selectedTimes = createBookingDto.selected_times.split(',');
        const bookings: Booking[] = [];

        for (const timeSlot of selectedTimes) {
          const [start_time, end_time] = timeSlot.split('-');
          const bookingData = {
            ...createBookingDto,
            start_time,
            end_time,
          };

          const booking = await this.bookingService.create(bookingData);
          bookings.push(booking);
        }

        return bookings[0]; // Trả về booking đầu tiên cho UI hiện tại
      }

      return this.bookingService.create(createBookingDto);
    } catch (error) {
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
  findMyBookings(@Request() req: RequestWithUser): Promise<Booking[]> {
    return this.bookingService.findBookingsByUserId(req.user.user_id); // Sửa từ userId thành user_id
  }

  // Lấy tất cả đặt sân (chỉ admin và manager)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  findAll(
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('court_id') courtId?: number,
  ): Promise<Booking[]> {
    return this.bookingService.findAll(status, date, courtId);
  }

  // Lấy chi tiết một đặt sân
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ): Promise<Booking> {
    const booking = await this.bookingService.findOne(id);

    // Chỉ cho phép admin/manager hoặc chủ booking xem thông tin
    if (
      req.user.role === 'admin' || // Thay đổi từ roles?.includes sang kiểm tra role trực tiếp
      req.user.role === 'manager' ||
      booking.user_id === req.user.user_id // Sửa từ userId thành user_id
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
  ): Promise<Booking> {
    return this.bookingService.update(id, updateBookingDto);
  }

  // Hủy đặt sân
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ): Promise<Booking> {
    const booking = await this.bookingService.findOne(id);

    // Chỉ cho phép admin/manager hoặc chủ booking hủy
    if (
      req.user.role === 'admin' || // Thay đổi từ roles?.includes sang kiểm tra role trực tiếp
      req.user.role === 'manager' ||
      booking.user_id === req.user.user_id // Sửa từ userId thành user_id
    ) {
      return this.bookingService.cancel(id);
    }
    throw new HttpException('Không có quyền truy cập', HttpStatus.FORBIDDEN);
  }
}
