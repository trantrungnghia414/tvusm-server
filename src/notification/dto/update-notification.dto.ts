// server/src/notification/dto/update-notification.dto.ts
import { IsBoolean, IsOptional, IsNumber, IsArray } from 'class-validator';

export class UpdateNotificationDto {
  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}

export class MarkAsReadDto {
  @IsArray()
  @IsNumber({}, { each: true })
  notification_ids: number[];
}
