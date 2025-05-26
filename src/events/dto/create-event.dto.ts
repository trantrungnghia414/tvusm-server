import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventStatus, EventType } from '../entities/event.entity';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsOptional()
  @IsString()
  end_date?: string;

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

  @IsOptional()
  @IsNumber()
  organizer_id?: number;

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
  @Transform(({ value }) => {
    if (value === undefined) return 1; // Mặc định là 1
    return value === '1' || value === 1 || value === true ? 1 : 0;
  })
  is_public?: number = 1; // Mặc định là 1

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined) return 1; // Mặc định là 1
    return value === '1' || value === 1 || value === true ? 1 : 0;
  })
  is_featured?: number = 1; // Mặc định là 1

  @IsOptional()
  @Type(() => Date)
  registration_deadline?: Date;

  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  @IsOptional()
  organizer_name: string;
}
