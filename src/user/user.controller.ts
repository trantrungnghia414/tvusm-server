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
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GoogleAuthDto } from 'src/user/dto/google-auth.dto';
import { ChangePasswordDto } from 'src/user/dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

interface RequestWithUser extends Request {
  user: {
    user_id: number;
    login: string;
    password: string;
    role: string;
  };
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard) //JwtAuthGuard có tác dụng bảo vệ route này chỉ cho phép người dùng đã xác thực truy cập
  getProfile(@Request() req: RequestWithUser) {
    return this.userService.getFullProfile(req.user.user_id); // trả về thông tin người dùng đã xác thực
  }

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.userService.verifyEmail(token);
  }

  @Post('verify-code')
  async verifyCode(@Body() body: { email: string; code: string }) {
    return this.userService.verifyCode(body.email, body.code);
  }

  @Post('resend-code')
  async resendVerificationCode(@Body() body: { email: string }) {
    return this.userService.resendVerificationCode(body.email);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const userId = req.params.id;
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `user-${userId}-${uniqueSuffix}${ext}`);
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
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    // Kiểm tra quyền truy cập
    if (req.user.user_id !== id && req.user.role !== 'admin') {
      throw new UnauthorizedException(
        'Bạn không có quyền cập nhật thông tin cho người dùng khác',
      );
    }

    // Nếu có file ảnh mới được tải lên
    if (file) {
      // Tìm user hiện tại để kiểm tra avatar cũ
      const currentUser = await this.userService.findOne(id);

      // Xóa avatar cũ nếu có và không phải là ảnh mặc định
      if (
        currentUser?.avatar &&
        !currentUser.avatar.includes('default') &&
        fs.existsSync(`.${currentUser.avatar}`)
      ) {
        try {
          fs.unlinkSync(`.${currentUser.avatar}`);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
        }
      }

      // Thêm đường dẫn ảnh mới vào dữ liệu cập nhật
      const avatarUrl = `/uploads/avatars/${file.filename}`;
      updateUserDto.avatar = avatarUrl;
    }

    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.userService.remove(id);
  }

  @Post('login')
  login(@Body() body: { login: string; password: string }) {
    return this.userService.login(body.login, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.userService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { email: string; code: string; password: string },
  ) {
    return this.userService.resetPassword(body.email, body.code, body.password);
  }

  @Post('google-auth')
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.userService.googleAuth(googleAuthDto);
  }

  @Post(':id/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(
      id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
