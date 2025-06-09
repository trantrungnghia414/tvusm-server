import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { UpdateNewsStatusDto } from './dto/update-news-status.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Request } from 'express';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // API lấy danh sách tin tức (dành cho admin/quản lý)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('search') search?: string) {
    return this.newsService.findAll(search);
  }

  // API lấy danh sách tin tức công khai cho frontend
  @Get('public')
  async findPublic() {
    return this.newsService.findAll();
  }

  // API lấy danh sách tin tức nổi bật
  @Get('featured')
  async findFeatured(@Query('limit') limit = 5) {
    return this.newsService.findFeatured(+limit);
  }

  // API lấy danh sách tin tức mới nhất
  @Get('latest')
  async findLatest(@Query('limit') limit = 10) {
    return this.newsService.findLatest(+limit);
  }

  // API tìm kiếm tin tức
  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit = 10) {
    return this.newsService.search(query, +limit);
  }

  // API lấy danh sách danh mục tin tức
  @Get('categories')
  async findAllCategories() {
    return this.newsService.findAllCategories();
  }

  // API tạo danh mục tin tức mới (cần quyền admin)
  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createCategory(
    @Body() body: { name: string; slug: string; description?: string },
  ) {
    return this.newsService.createCategory(
      body.name,
      body.slug,
      body.description,
    );
  }

  // API cập nhật danh mục tin tức (cần quyền admin)
  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; slug: string; description?: string },
  ) {
    return this.newsService.updateCategory(
      id,
      body.name,
      body.slug,
      body.description,
    );
  }

  // API xóa danh mục tin tức (cần quyền admin)
  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.deleteCategory(id);
  }

  // API lấy tin tức theo danh mục
  @Get('categories/:id')
  async findByCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit = 10,
  ) {
    return this.newsService.findByCategory(id, +limit);
  }

  // API lấy tin tức theo ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.newsService.findOne(id, req);
  }

  // API lấy tin tức theo slug
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string, @Req() req: Request) {
    return this.newsService.findBySlug(slug, req);
  }

  // API tạo tin tức mới (cần đăng nhập)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: diskStorage({
        destination: './uploads/news',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${randomName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh: jpg, jpeg, png, gif, webp',
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
    @Body() createNewsDto: CreateNewsDto,
    @GetUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const thumbnailPath = file ? `/uploads/news/${file.filename}` : undefined;
    return this.newsService.create(createNewsDto, user.user_id, thumbnailPath);
  }

  // API cập nhật tin tức (cần đăng nhập)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: diskStorage({
        destination: './uploads/news',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${randomName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh: jpg, jpeg, png, gif, webp',
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
    @Body() updateNewsDto: UpdateNewsDto,
    @GetUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const thumbnailPath = file ? `/uploads/news/${file.filename}` : undefined;
    const isAdmin = user.role === 'admin';

    return this.newsService.update(
      id,
      updateNewsDto,
      user.user_id,
      thumbnailPath,
      isAdmin,
    );
  }

  // API cập nhật trạng thái tin tức (cần đăng nhập)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNewsStatusDto: UpdateNewsStatusDto,
    @GetUser() user: User,
  ) {
    const isAdmin = user.role === 'admin';
    return this.newsService.updateStatus(
      id,
      updateNewsStatusDto,
      user.user_id,
      isAdmin,
    );
  }

  // API xóa tin tức (cần đăng nhập)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    const isAdmin = user.role === 'admin';
    return this.newsService.remove(id, user.user_id, isAdmin);
  }
}
