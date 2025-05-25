import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantStatusDto } from './dto/update-participant-status.dto';
import { EventStatus } from './entities/event.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// Thêm interface để định nghĩa kiểu cho request
interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
    role: string;
  };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Tạo sự kiện mới (cần xác thực)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/events',
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
    @Body() createEventDto: CreateEventDto,
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Xử lý file ảnh nếu có
    if (file) {
      const imageUrl = `/uploads/events/${file.filename}`;
      return this.eventsService.create(
        { ...createEventDto, image: imageUrl },
        req.user.userId,
      );
    }
    return this.eventsService.create(createEventDto, req.user.userId);
  }

  // Lấy danh sách tất cả sự kiện (không cần xác thực)
  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  // Lấy chi tiết một sự kiện (không cần xác thực)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  // Cập nhật sự kiện (cần xác thực)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/events',
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Xử lý file ảnh nếu có
    if (file) {
      const imageUrl = `/uploads/events/${file.filename}`;
      return this.eventsService.update(id, {
        ...updateEventDto,
        image: imageUrl,
      });
    }
    return this.eventsService.update(id, updateEventDto);
  }

  // Xóa sự kiện (cần quyền admin hoặc manager)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.remove(id);
  }

  // Cập nhật trạng thái sự kiện (cần quyền admin hoặc manager)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: EventStatus,
  ) {
    return this.eventsService.updateStatus(id, status);
  }

  // Người tham gia
  @Get(':id/participants')
  @UseGuards(JwtAuthGuard)
  getParticipants(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findParticipants(id);
  }

  @Post(':id/participants')
  @UseGuards(JwtAuthGuard)
  addParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Body() createParticipantDto: CreateParticipantDto,
  ) {
    return this.eventsService.addParticipant(id, createParticipantDto);
  }

  @Patch(':id/participants/:participantId')
  @UseGuards(JwtAuthGuard)
  updateParticipantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('participantId', ParseIntPipe) participantId: number,
    @Body() updateDto: UpdateParticipantStatusDto,
  ) {
    return this.eventsService.updateParticipantStatus(
      id,
      participantId,
      updateDto,
    );
  }

  @Delete(':id/participants/:participantId')
  @UseGuards(JwtAuthGuard)
  removeParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Param('participantId', ParseIntPipe) participantId: number,
  ) {
    return this.eventsService.removeParticipant(id, participantId);
  }
}
