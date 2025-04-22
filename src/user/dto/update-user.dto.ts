import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Các thuộc tính có thể được cập nhật
  name?: string; // Tên người dùng
  email?: string; // Địa chỉ email
  password?: string; // Mật khẩu (nếu cần thay đổi)
  phone?: string; // Số điện thoại
  address?: string; // Địa chỉ
  role?: string; // Vai trò của người dùng (admin, user, v.v.)
  created_at?: Date; // Ngày tạo tài khoản

  currentPassword?: string; // Mật khẩu hiện tại (nếu cần xác thực trước khi thay đổi mật khẩu mới)
  newPassword?: string; // Mật khẩu mới (nếu cần thay đổi)
}
