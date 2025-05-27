import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { NewsStatus } from '../entities/news.entity';
import { Type } from 'class-transformer';

export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  category_id?: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  is_featured?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  is_internal?: number;

  // published_at sẽ được cập nhật tự động trong service nếu status chuyển sang PUBLISHED
}
