export class CreateUserDto {
  username: string; // Tên đăng nhập
  password: string; // Mật khẩu
  fullname: string; // Họ tên
  email: string; // Địa chỉ email
  phone: string; // Số điện thoại

  avatar: string; // Đường dẫn đến ảnh đại diện
  role: string; // Vai trò của người dùng (user, admin)
}
