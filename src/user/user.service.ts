/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { GoogleAuthDto } from 'src/user/dto/google-auth.dto';

import * as fs from 'fs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly authService: AuthService,
    private mailService: MailService,
  ) {} // Hang này sẽ tự động tạo một instance của User repository và gán nó vào biến userRepo.

  // ============== CREATE USER ==================
  // Tạo một người dùng mới với thông tin từ createUserDto
  // async create(createUserDto: CreateUserDto) {
  //   const existingUser = await this.userRepo.findOne({
  //     where: [
  //       { email: createUserDto.email },
  //       { username: createUserDto.username },
  //     ],
  //   });
  //   // Kiểm tra xem email hoặc username đã tồn tại chưa
  //   if (existingUser && existingUser.email === createUserDto.email) {
  //     throw new NotFoundException(`Email ${createUserDto.email} đã tồn tại`);
  //   }
  //   if (existingUser && existingUser.username === createUserDto.username) {
  //     throw new NotFoundException(
  //       `Tên đăng nhập ${createUserDto.username} đã tồn tại`,
  //     );
  //   }

  //   // Tạo mã xác thực 6 chữ số
  //   const verificationCode = Math.floor(
  //     100000 + Math.random() * 900000,
  //   ).toString();
  //   const verificationExpires = new Date();
  //   verificationExpires.setMinutes(verificationExpires.getMinutes() + 15); // Hết hạn sau 15 phút

  //   // Tạo một salt mới để mã hoá mật khẩu
  //   const salt = bcrypt.genSaltSync();
  //   // Mã hoá mật khẩu mới với salt đã tạo
  //   const hashPassword = await bcrypt.hash(createUserDto.password, salt);

  //   const newUser = this.userRepo.create({
  //     ...createUserDto,
  //     password: hashPassword,
  //     role: 'customer', // Mặc định là customer
  //     created_at: new Date(), // Ngày tạo tài khoản
  //     verification_token: verificationCode,
  //     verification_expires: verificationExpires,
  //     is_verified: false,
  //   });
  //   // Lưu người dùng mới vào cơ sở dữ liệu
  //   await this.userRepo.save(newUser);

  //   // Gửi email xác thực
  //   await this.mailService.sendVerificationCode(
  //     newUser.email,
  //     verificationCode,
  //   );

  //   return {
  //     message: 'Vui lòng kiểm tra email để lấy mã xác thực',
  //     email: newUser.email,
  //   };
  // }

  async create(createUserDto: CreateUserDto, byAdmin = false) {
    // Nếu không phải admin tạo tài khoản, kiểm tra xem email hoặc username đã tồn tại chưa
    const existingUser = await this.userRepo.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });
    // Kiểm tra xem email hoặc username đã tồn tại chưa
    if (existingUser && existingUser.email === createUserDto.email) {
      throw new NotFoundException(`Email ${createUserDto.email} đã tồn tại`);
    }
    if (existingUser && existingUser.username === createUserDto.username) {
      throw new NotFoundException(
        `Tên đăng nhập ${createUserDto.username} đã tồn tại`,
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
      // Nếu admin tạo, tự động xác thực và không cần mã xác nhận
      is_verified: byAdmin,
      verification_token: byAdmin
        ? null
        : Math.floor(100000 + Math.random() * 900000).toString(),
      verification_expires: byAdmin
        ? null
        : new Date(Date.now() + 15 * 60 * 1000),
    });
    // Lưu người dùng mới vào cơ sở dữ liệu
    await this.userRepo.save(newUser);

    // Nếu không phải do admin tạo, gửi email xác thực
    if (!byAdmin && newUser.verification_token) {
      await this.mailService.sendVerificationCode(
        newUser.email,
        newUser.verification_token,
      );
      return {
        message: 'Vui lòng kiểm tra email để lấy mã xác thực',
        email: newUser.email,
      };
    }

    return {
      message: 'Tạo người dùng thành công',
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  // ============== VERIFY EMAIL ==================
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

  // ============== VERIFY CODE ==================
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

  // ============== RESEND VERIFY CODE ==================
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

  // ============== FIND ALL USERS ==================
  // Tìm tất cả người dùng trong cơ sở dữ liệu
  findAll() {
    return this.userRepo.find();
  }

  // ============== FIND ONE USER ==================
  // Tìm một người dùng theo ID
  async findOne(user_id: number) {
    const user = await this.userRepo.findOneBy({ user_id });
    if (!user) throw new NotFoundException(`User with ID ${user_id} not found`);
    return user;
  }

  // ============== UPDATE USER ==================
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

  // ============== DELETE USER ==================
  async remove(user_id: number) {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException(`User with ID ${user_id} not found`);

    // // Xóa avatar từ filesystem nếu có và không phải avatar mặc định
    if (
      user.avatar &&
      !user.avatar.includes('default') &&
      fs.existsSync(`.${user.avatar}`)
    ) {
      try {
        fs.unlinkSync(`.${user.avatar}`);
        console.log(`Đã xóa avatar: ${user.avatar}`);
      } catch (error) {
        console.error('Lỗi khi xóa avatar:', error);
        // Tiếp tục xóa user ngay cả khi xóa file avatar thất bại
      }
    }

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

      throw new UnauthorizedException({
        message:
          'Please verify your email first. A new verification code has been sent.',
        email: user.email,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new NotFoundException(`Invalid password`);

    return this.authService.generateToken(user);
  }

  // ============== FORGOT PASSWORD ==================
  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này');
    }

    // Tạo mã xác thực 6 chữ số giống như verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 15); // Hết hạn sau 15 phút

    user.reset_password_token = resetCode;
    user.reset_password_expires = resetExpires;
    await this.userRepo.save(user);

    // Gửi mã qua email thay vì link
    await this.mailService.sendResetPasswordCode(user.email, resetCode);

    return {
      message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn',
      email: user.email,
    };
  }

  // ============== RESET PASSWORD ==================
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: {
        email,
        reset_password_token: code,
        reset_password_expires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }

    const salt = bcrypt.genSaltSync();
    const hashPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashPassword;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await this.userRepo.save(user);

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  // ============== GOOGLE AUTH ==================
  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { email, name, picture, googleId } = googleAuthDto;

    // Kiểm tra xem người dùng đã tồn tại chưa (bằng email hoặc google_id)
    let user = await this.userRepo.findOne({
      where: [{ email }, { google_id: googleId }],
    });

    if (!user) {
      // TH1: Người dùng chưa tồn tại - Tạo tài khoản mới
      console.log('Creating new user for Google login');

      // Tạo username từ email (gmail.com -> username)
      const emailUsername = email.split('@')[0];
      // Loại bỏ ký tự đặc biệt, để lại chữ cái, số và _
      let username = emailUsername.replace(/[^a-zA-Z0-9_]/g, '_');

      // Kiểm tra xem username đã tồn tại chưa
      const existingUsername = await this.userRepo.findOne({
        where: { username },
      });
      if (existingUsername) {
        // Nếu username đã tồn tại, thêm số ngẫu nhiên vào cuối
        username = `${username}_${Math.floor(Math.random() * 1000)}`;
      }

      // Tạo mật khẩu ngẫu nhiên an toàn
      const randomPassword =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).slice(-10).toUpperCase() +
        Math.random().toString(36).slice(-2);

      // Mã hóa mật khẩu
      const salt = bcrypt.genSaltSync();
      const hashPassword = await bcrypt.hash(randomPassword, salt);

      // Tạo người dùng mới
      user = this.userRepo.create({
        email,
        username,
        password: hashPassword,
        google_id: googleId,
        is_verified: true, // Tài khoản Google đã được xác thực
        name: name || username,
        avatar: picture,
        role: 'customer', // Mặc định là khách hàng
        created_at: new Date(),
      });

      await this.userRepo.save(user);
      console.log('New user created:', user.username);
    } else if (!user.google_id) {
      // TH2: Người dùng đã tồn tại nhưng chưa liên kết với Google
      console.log('Linking existing user to Google account');

      // Cập nhật thông tin Google
      user.google_id = googleId;
      user.is_verified = true; // Tự động xác thực tài khoản
      if (picture && !user.avatar) user.avatar = picture;
      if (name && !user.name) user.name = name;

      await this.userRepo.save(user);
      console.log('User linked to Google:', user.username);
    } else {
      // TH3: Người dùng đã tồn tại và đã liên kết với Google
      console.log('Existing Google user logging in:', user.username);
    }

    // Tạo JWT token
    const token = this.authService.generateToken(user);

    // Trả về thông tin đăng nhập
    return {
      access_token: token,
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      name: user.name,
    };
  }

  // ============== GET PROFILE BY ID ==================
  async getFullProfile(userId: number) {
    const user = await this.userRepo.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Loại bỏ trường password và các thông tin nhạy cảm khác trước khi trả về
    const {
      password,
      verification_token,
      verification_expires,
      reset_password_token,
      reset_password_expires,
      ...userInfo
    } = user;

    return userInfo;
  }

  // ============== CHANGE PASSWORD ==================
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${userId}`);
    }

    // Xác thực mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    // Mã hoá mật khẩu mới
    const salt = bcrypt.genSaltSync();
    const hashPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu mới
    user.password = hashPassword;
    await this.userRepo.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }
}
