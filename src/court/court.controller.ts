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
  ParseIntPipe,
  BadRequestException,
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

    if (createCourtDto.is_indoor !== undefined) {
      // Chuyển đổi tất cả các giá trị có thể thành 0/1
      if (typeof createCourtDto.is_indoor === 'string') {
        const value = (createCourtDto.is_indoor as string).toLowerCase();

        if (
          value === 'false' ||
          value === '0' ||
          value === 'outdoor' ||
          value === ''
        ) {
          createCourtDto.is_indoor = 0; // Lưu số 0 thay vì boolean false
        } else {
          createCourtDto.is_indoor = 1; // Lưu số 1 thay vì boolean true
        }
      } else if (typeof createCourtDto.is_indoor === 'boolean') {
        createCourtDto.is_indoor = createCourtDto.is_indoor ? 1 : 0; // Chuyển boolean thành số
      } else if (typeof createCourtDto.is_indoor === 'number') {
        createCourtDto.is_indoor = createCourtDto.is_indoor ? 1 : 0; // Đảm bảo chỉ lưu 0 hoặc 1
      }
    }

    return this.courtService.create(createCourtDto);
  }

  @Get()
  findAll() {
    return this.courtService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.findOne(id);
  }

  @Get('venue/:id')
  findByVenue(@Param('id', ParseIntPipe) venueId: number) {
    return this.courtService.findByVenue(venueId);
  }

  @Get('type/:id')
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

    if (updateCourtDto.is_indoor !== undefined) {
      // Chuyển đổi tất cả các giá trị có thể thành 0/1
      if (typeof updateCourtDto.is_indoor === 'string') {
        const value = (updateCourtDto.is_indoor as string).toLowerCase();

        if (
          value === 'false' ||
          value === '0' ||
          value === 'outdoor' ||
          value === ''
        ) {
          updateCourtDto.is_indoor = 0; // Lưu số 0 thay vì boolean false
        } else {
          updateCourtDto.is_indoor = 1; // Lưu số 1 thay vì boolean true
        }
      } else if (typeof updateCourtDto.is_indoor === 'boolean') {
        updateCourtDto.is_indoor = updateCourtDto.is_indoor ? 1 : 0; // Chuyển boolean thành số
      } else if (typeof updateCourtDto.is_indoor === 'number') {
        updateCourtDto.is_indoor = updateCourtDto.is_indoor ? 1 : 0; // Đảm bảo chỉ lưu 0 hoặc 1
      }
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
}
