import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly authService: AuthService,
    private mailService: MailService,
  ) {} // Hang này sẽ tự động tạo một instance của User repository và gán nó vào biến userRepo.

  // Tạo một người dùng mới với thông tin từ createUserDto
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepo.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });
    // Kiểm tra xem email hoặc username đã tồn tại chưa
    if (existingUser && existingUser.email === createUserDto.email) {
      throw new NotFoundException(
        `Email ${createUserDto.email} already exists`,
      );
    }
    if (existingUser && existingUser.username === createUserDto.username) {
      throw new NotFoundException(
        `Username ${createUserDto.username} already exists`,
      );
    }

    // Tạo mã xác thực 6 chữ số
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15); // Hết hạn sau 15 phút

    // Tạo một salt mới để mã hoá mật khẩu
    const salt = bcrypt.genSaltSync();
    // Mã hoá mật khẩu mới với salt đã tạo
    const hashPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.userRepo.create({
      ...createUserDto,
      password: hashPassword,
      role: 'customer', // Mặc định là customer
      created_at: new Date(), // Ngày tạo tài khoản
      verification_token: verificationCode,
      verification_expires: verificationExpires,
      is_verified: false,
    });
    // Lưu người dùng mới vào cơ sở dữ liệu
    await this.userRepo.save(newUser);

    // Gửi email xác thực
    await this.mailService.sendVerificationCode(
      newUser.email,
      verificationCode,
    );

    return {
      message: 'Vui lòng kiểm tra email để lấy mã xác thực',
      email: newUser.email,
    };
  }

  // Xác thực email
  // Nếu token hợp lệ, cập nhật trạng thái is_verified thành true và xoá token
  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: { verification_token: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    user.is_verified = true;
    user.verification_token = null;
    await this.userRepo.save(user);

    return { message: 'Email verified successfully' };
  }

  async verifyCode(email: string, code: string) {
    const user = await this.userRepo.findOne({
      where: {
        email,
        verification_token: code,
        verification_expires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new NotFoundException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }

    user.is_verified = true;
    user.verification_token = null;
    user.verification_expires = null;
    await this.userRepo.save(user);

    return { message: 'Xác thực thành công' };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Email không tồn tại');
    }

    if (user.is_verified) {
      throw new BadRequestException('Tài khoản đã được xác thực');
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15);

    user.verification_token = verificationCode;
    user.verification_expires = verificationExpires;
    await this.userRepo.save(user);

    await this.mailService.sendVerificationCode(email, verificationCode);

    return { message: 'Đã gửi lại mã xác thực mới' };
  }

  // Tìm tất cả người dùng trong cơ sở dữ liệu
  findAll() {
    return this.userRepo.find();
  }

  // Tìm một người dùng theo ID
  async findOne(user_id: number) {
    const user = await this.userRepo.findOneBy({ user_id });
    if (!user) throw new NotFoundException(`User with ID ${user_id} not found`);
    return user;
  }

  // Cập nhật thông tin người dùng
  async update(user_id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(user_id);

    // Nếu có yêu cầu thay đổi mật khẩu
    if (updateUserDto.newPassword) {
      // Kiểm tra mật khẩu hiện tại
      if (!updateUserDto.currentPassword) {
        throw new NotFoundException('Current password is required');
      }

      // Xác thực mật khẩu hiện tại
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new NotFoundException('Current password is incorrect');
      }

      // Mã hoá mật khẩu mới
      const salt = bcrypt.genSaltSync();
      const hashPassword = await bcrypt.hash(updateUserDto.newPassword, salt);

      // Cập nhật mật khẩu mới đã mã hoá
      updateUserDto.password = hashPassword;
    }

    // Xoá các trường không cần thiết
    delete updateUserDto.currentPassword;
    delete updateUserDto.newPassword;

    const updatedUser = { ...user, ...updateUserDto };
    return this.userRepo.save(updatedUser);
  }

  // Xoá người dùng khỏi cơ sở dữ liệu
  async remove(user_id: number) {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException(`User with ID ${user_id} not found`);
    await this.userRepo.delete(user_id);
  }

  // ============== LOGIN ==================
  async login(login: string, password: string) {
    const user = await this.userRepo.findOne({
      where: [{ email: login }, { username: login }],
    });
    if (!user)
      throw new NotFoundException(`User with email ${login} not found`);

    if (!user.is_verified) {
      // Gửi lại mã xác thực thay vì gửi email với link
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const verificationExpires = new Date();
      verificationExpires.setMinutes(verificationExpires.getMinutes() + 15);

      user.verification_token = verificationCode;
      user.verification_expires = verificationExpires;
      await this.userRepo.save(user);

      await this.mailService.sendVerificationCode(user.email, verificationCode);

      throw new UnauthorizedException(
        'Please verify your email first. A new verification code has been sent.',
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new NotFoundException(`Invalid password`);

    return this.authService.generateToken(user);
  }

  // ============== FORGOT PASSWORD ==================
  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    user.reset_password_token = resetToken;
    user.reset_password_expires = resetTokenExpiry;
    await this.userRepo.save(user);

    // await this.mailService.sendResetPasswordEmail(email, resetToken);

    return { message: 'Password reset email sent' };
  }

  // ============== RESET PASSWORD ==================
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    const salt = bcrypt.genSaltSync();
    const hashPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashPassword;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await this.userRepo.save(user);

    return { message: 'Password reset successfully' };
  }
}
