import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEmail,
  IsDateString,
} from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty({ message: 'Vui lòng chọn sân' })
  @IsNumber()
  court_id: number;

  @IsNotEmpty({ message: 'Vui lòng chọn ngày' })
  @IsDateString()
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

  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  @IsString()
  renter_phone: string;

  // ✅ Email là optional
  @IsOptional()
  @IsEmail({}, { message: 'Vui lòng nhập email hợp lệ' })
  @IsString()
  renter_email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  // ✅ Thêm field payment_method
  @IsOptional()
  @IsString()
  payment_method?: string;
}
