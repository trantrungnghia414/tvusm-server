import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
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
  is_public?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

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
