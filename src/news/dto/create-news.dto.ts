import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { NewsStatus } from '../entities/news.entity';
import { Type } from 'class-transformer';

export class CreateNewsDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  category_id: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus = NewsStatus.DRAFT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  is_featured?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  is_internal?: number = 0;

  // Các trường được thêm tự động ở service:
  // - author_id từ JWT
  // - published_at nếu status là PUBLISHED
  // - thumbnail từ file upload
}
