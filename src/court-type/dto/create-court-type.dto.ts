import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCourtTypeDto {
  @IsNotEmpty({ message: 'Tên loại sân không được để trống' })
  @IsString({ message: 'Tên loại sân phải là chuỗi' })
  @MaxLength(100, { message: 'Tên loại sân không được vượt quá 100 ký tự' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Kích thước tiêu chuẩn phải là chuỗi' })
  @MaxLength(50, {
    message: 'Kích thước tiêu chuẩn không được vượt quá 50 ký tự',
  })
  standard_size?: string;
}
