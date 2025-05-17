import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  ConflictException,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourtTypeService } from './court-type.service';
import { CreateCourtTypeDto } from './dto/create-court-type.dto';
import { UpdateCourtTypeDto } from './dto/update-court-type.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('court-types')
export class CourtTypeController {
  constructor(private readonly courtTypeService: CourtTypeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/court-types',
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
            new BadRequestException('Chỉ cho phép file ảnh JPG, PNG hoặc GIF'),
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
    @Body() createCourtTypeDto: CreateCourtTypeDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      createCourtTypeDto.image = `/uploads/court-types/${file.filename}`;
    }
    return this.courtTypeService.create(createCourtTypeDto);
  }

  @Get()
  findAll() {
    return this.courtTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courtTypeService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/court-types',
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
            new BadRequestException('Chỉ cho phép file ảnh JPG, PNG hoặc GIF'),
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
    @Body() updateCourtTypeDto: UpdateCourtTypeDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      updateCourtTypeDto.image = `/uploads/court-types/${file.filename}`;
    }
    return this.courtTypeService.update(id, updateCourtTypeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const isInUse = await this.courtTypeService.isInUse(id);
    if (isInUse) {
      throw new ConflictException(
        'Không thể xóa loại sân này vì đang được sử dụng bởi một hoặc nhiều sân',
      );
    }
    return this.courtTypeService.remove(id);
  }

  @Get(':id/is-in-use')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  isInUse(@Param('id', ParseIntPipe) id: number) {
    return this.courtTypeService.isInUse(id);
  }
}
