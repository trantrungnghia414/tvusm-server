// server/src/notification/dto/create-notification.dto.ts
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsNumber()
  user_id: number;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsNumber()
  @IsOptional()
  reference_id?: number;

  @IsOptional()
  data?: any;
}

export class BulkCreateNotificationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  user_ids: number[];

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsNumber()
  @IsOptional()
  reference_id?: number;

  @IsOptional()
  data?: any;
}
