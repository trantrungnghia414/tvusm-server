import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ParseIntPipe,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VenueService } from './venue.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  // =================== CREATE =======================
  // Tạo nhà thi đấu mới (cần quyền admin hoặc manager)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/venues',
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên
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
    @Body() createVenueDto: CreateVenueDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Nếu có file ảnh, thêm đường dẫn vào DTO
    if (file) {
      createVenueDto.image = `/uploads/venues/${file.filename}`;
    }
    return this.venueService.create(createVenueDto);
  }

  // =================== GET ALL =======================
  // Lấy danh sách tất cả nhà thi đấu (không cần xác thực)
  @Get()
  findAll() {
    return this.venueService.findAll();
  }

  // =================== GET ONE =======================
  // Lấy chi tiết một nhà thi đấu (không cần xác thực)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.venueService.findOne(id);
  }

  // =================== UPDATE =======================
  // Cập nhật thông tin nhà thi đấu (cần quyền admin hoặc manager)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/venues',
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
    @Body() updateVenueDto: UpdateVenueDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      updateVenueDto.image = `/uploads/venues/${file.filename}`;
    }
    return this.venueService.update(id, updateVenueDto);
  }

  // Cập nhật trạng thái nhà thi đấu (cần quyền admin hoặc manager)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'active' | 'maintenance' | 'inactive',
  ) {
    return this.venueService.updateStatus(id, status);
  }

  // =================== DELETE =======================
  // Xóa nhà thi đấu (chỉ admin có quyền)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.venueService.remove(id);
      return { message: 'Xóa nhà thi đấu thành công' };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw error;
    }
  }
}
