import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../user/entities/user.entity';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { UpdateEquipmentStatusDto } from './dto/update-equipment-status.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // API lấy danh sách thiết bị
  @Get()
  async findAll(@Query('search') search?: string) {
    try {
      console.log('Controller findAll được gọi với search =', search);
      return await this.equipmentService.findAll(search);
    } catch (error) {
      console.error('Error in equipment controller findAll:', error);
      // Trả về mảng rỗng thay vì lỗi 500
      return [];
    }
  }

  // API tìm kiếm thiết bị
  @Get('search')
  search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.equipmentService.search(query, limit);
  }

  // API lấy danh sách danh mục thiết bị
  @Get('categories')
  findAllCategories() {
    return this.equipmentService.findAllCategories();
  }

  // API tạo danh mục thiết bị mới (cần quyền admin)
  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.equipmentService.createCategory(createCategoryDto);
  }

  // API lấy thiết bị theo danh mục
  @Get('categories/:id')
  findByCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.equipmentService.findByCategory(id, limit);
  }

  // API lấy thiết bị theo trạng thái
  @Get('status/:status')
  findByStatus(
    @Param('status') status: string,
    @Query('limit') limit?: number,
  ) {
    return this.equipmentService.findByStatus(status as any, limit);
  }

  // API lấy thông tin chi tiết thiết bị
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.findOne(id);
  }

  // API tạo thiết bị mới (cần đăng nhập)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/equipment',
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên với timestamp
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Chỉ chấp nhận file ảnh'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async create(
    @Body() createEquipmentDto: CreateEquipmentDto,
    @GetUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const imagePath = file
        ? `/uploads/equipment/${file.filename}`
        : undefined;
      return await this.equipmentService.create(
        createEquipmentDto,
        user.user_id,
        imagePath,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi khi tạo thiết bị');
    }
  }

  // API cập nhật thiết bị (cần đăng nhập)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/equipment',
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên với timestamp
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Chỉ chấp nhận file ảnh'), false);
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
    @Body() updateEquipmentDto: UpdateEquipmentDto,
    @GetUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const imagePath = file
        ? `/uploads/equipment/${file.filename}`
        : undefined;
      const isAdmin = user.role === 'admin';
      return await this.equipmentService.update(
        id,
        updateEquipmentDto,
        user.user_id,
        imagePath,
        isAdmin,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi khi cập nhật thiết bị');
    }
  }

  // API cập nhật trạng thái thiết bị (cần đăng nhập)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateEquipmentStatusDto,
    @GetUser() user: User,
  ) {
    try {
      const isAdmin = user.role === 'admin';
      return await this.equipmentService.updateStatus(
        id,
        updateStatusDto,
        user.user_id,
        isAdmin,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Lỗi khi cập nhật trạng thái thiết bị',
      );
    }
  }

  // API xóa thiết bị (cần đăng nhập)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    try {
      const isAdmin = user.role === 'admin';
      return this.equipmentService.remove(id, user.user_id, isAdmin);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Lỗi khi xóa thiết bị');
    }
  }

  // Thêm endpoint mới để cập nhật danh mục
  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: CreateCategoryDto,
  ) {
    return this.equipmentService.updateCategory(id, updateCategoryDto);
  }

  // Thêm endpoint mới để xóa danh mục
  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.deleteCategory(id);
  }
}
