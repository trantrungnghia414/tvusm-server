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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GoogleAuthDto } from 'src/user/dto/google-auth.dto';
import { ChangePasswordDto } from 'src/user/dto/change-password.dto';

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
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
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
