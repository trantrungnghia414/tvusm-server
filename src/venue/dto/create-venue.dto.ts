import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateVenueDto {
  @IsNotEmpty({ message: 'Tên nhà thi đấu không được để trống' })
  @IsString({ message: 'Tên nhà thi đấu phải là chuỗi' })
  name: string;

  @IsNotEmpty({ message: 'Địa điểm không được để trống' })
  @IsString({ message: 'Địa điểm phải là chuỗi' })
  location: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sức chứa phải là số nguyên' })
  @Min(0, { message: 'Sức chứa không được âm' })
  capacity?: number;

  @IsOptional()
  @IsEnum(['active', 'maintenance', 'inactive'], {
    message: 'Trạng thái phải là active, maintenance hoặc inactive',
  })
  status?: 'active' | 'maintenance' | 'inactive';

  // Image sẽ được xử lý thông qua file upload
  @IsOptional()
  image?: string;
}
