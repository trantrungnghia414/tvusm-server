import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  // IsDate,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus, EventType } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  @Type(() => Date)
  start_date: Date;

  @IsOptional()
  @Type(() => Date)
  end_date?: Date;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsNumber()
  @IsPositive()
  venue_id: number;

  @IsOptional()
  @IsNumber()
  court_id?: number;

  @IsEnum(EventType)
  event_type: EventType;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsNumber()
  max_participants?: number;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @Type(() => Date)
  registration_deadline?: Date;

  // Thêm thuộc tính image
  @IsOptional()
  @IsString()
  image?: string;
}
