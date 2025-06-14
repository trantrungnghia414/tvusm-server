import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty({ message: 'Vui lòng chọn sân' })
  @IsNumber()
  court_id: number;

  @IsOptional()
  @IsNumber()
  user_id?: number;

  @IsNotEmpty({ message: 'Vui lòng chọn ngày' })
  @IsString()
  date: string;

  @IsNotEmpty({ message: 'Vui lòng chọn giờ bắt đầu' })
  @IsString()
  start_time: string;

  @IsNotEmpty({ message: 'Vui lòng chọn giờ kết thúc' })
  @IsString()
  end_time: string;

  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  @IsString()
  renter_name: string;

  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  @IsString()
  renter_email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  @IsString()
  renter_phone: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Trường payment_method không có trong DB nên đánh dấu là tùy chọn
  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  selected_times?: string;
}
