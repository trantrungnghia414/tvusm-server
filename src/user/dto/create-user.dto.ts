export class CreateUserDto {
  username: string; // Tên đăng nhập
  password: string; // Mật khẩu
  fullname: string; // Họ tên
  email: string; // Địa chỉ email
  phone: string; // Số điện thoại
  role: string; // Vai trò (admin, manager, customer)
  created_at: Date; // Ngày tạo tài khoản
}
