import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsPositive,
  // IsBoolean,
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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === '1' ? 1 : 0;
    }
    return value ? 1 : 0;
  })
  @IsNumber()
  is_public?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === '1' ? 1 : 0;
    }
    return value ? 1 : 0;
  })
  @IsNumber()
  is_featured?: number;

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
