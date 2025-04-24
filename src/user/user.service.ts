import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly authService: AuthService,
  ) {} // Hang này sẽ tự động tạo một instance của User repository và gán nó vào biến userRepo.

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

    // Tạo một salt mới để mã hoá mật khẩu
    const salt = bcrypt.genSaltSync();
    // Mã hoá mật khẩu mới với salt đã tạo
    const hashPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.userRepo.create({
      ...createUserDto,
      password: hashPassword,
      role: 'customer', // Mặc định là customer
      created_at: new Date(), // Ngày tạo tài khoản
    });
    // Lưu người dùng mới vào cơ sở dữ liệu
    return this.userRepo.save(newUser);
  }

  findAll() {
    return this.userRepo.find();
  }

  async findOne(user_id: number) {
    const user = await this.userRepo.findOneBy({ user_id });
    if (!user) throw new NotFoundException(`User with ID ${user_id} not found`);
    return user;
  }

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new NotFoundException(`Invalid password`);

    return this.authService.generateToken(user);
  }
}
