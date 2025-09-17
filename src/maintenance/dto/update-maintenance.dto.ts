import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { CreateMaintenanceDto } from './create-maintenance.dto';
import { MaintenanceStatus } from '../entities/maintenance.entity';

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsNumber()
  actual_cost?: number;

  @IsOptional()
  @IsNumber()
  actual_duration?: number;

  @IsOptional()
  @IsDateString()
  started_date?: string;

  @IsOptional()
  @IsDateString()
  completed_date?: string;
}
