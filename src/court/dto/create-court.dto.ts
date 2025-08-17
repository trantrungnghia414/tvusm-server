import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  // IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCourtDto {
  @IsNotEmpty({ message: 'Tên sân không được để trống' })
  @IsString({ message: 'Tên sân phải là chuỗi' })
  @MaxLength(100, { message: 'Tên sân không được vượt quá 100 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Mã sân không được để trống' })
  @IsString({ message: 'Mã sân phải là chuỗi' })
  @MaxLength(20, { message: 'Mã sân không được vượt quá 20 ký tự' })
  code: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @IsNotEmpty({ message: 'Giá thuê theo giờ không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá thuê phải là số' })
  @Min(0, { message: 'Giá thuê không được âm' })
  hourly_rate: number;

  @IsOptional()
  @IsEnum(['available', 'booked', 'maintenance'], {
    message: 'Trạng thái phải là available, booked hoặc maintenance',
  })
  status?: 'available' | 'booked' | 'maintenance';

  @IsOptional()
  @IsNotEmpty({ message: 'Trường trong nhà/ngoài trời phải được xác định' })
  @Transform(({ value }) => {
    if (value === 'true' || value === '1' || value === 1) return 1;
    if (value === 'false' || value === '0' || value === 0) return 0;
    return value ? 1 : 0;
  })
  is_indoor?: number; // Thay vì boolean

  @IsNotEmpty({ message: 'ID nhà thi đấu không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'ID nhà thi đấu phải là số' })
  venue_id: number;

  @IsNotEmpty({ message: 'ID loại sân không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'ID loại sân phải là số' })
  type_id: number;

  // ✅ Thêm trường court_level
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Cấp độ sân phải là số' })
  @Min(1, { message: 'Cấp độ sân phải từ 1 trở lên' })
  court_level?: number;

  @IsOptional()
  image?: string;
}
