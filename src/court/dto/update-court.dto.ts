import { PartialType } from '@nestjs/mapped-types';
import { CreateCourtDto } from './create-court.dto';
import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCourtDto extends PartialType(CreateCourtDto) {
  // ✅ Thêm court_level vào UpdateCourtDto
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  court_level?: number;
}
