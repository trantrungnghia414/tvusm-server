import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import {
  MaintenanceType,
  MaintenancePriority,
} from '../entities/maintenance.entity';

export class CreateMaintenanceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsEnum(MaintenancePriority)
  priority: MaintenancePriority;

  @IsOptional()
  @IsNumber()
  venue_id?: number;

  @IsOptional()
  @IsNumber()
  court_id?: number;

  @IsOptional()
  @IsNumber()
  equipment_id?: number;

  @IsOptional()
  @IsNumber()
  assigned_to?: number;

  @IsOptional()
  @IsNumber()
  estimated_cost?: number;

  @IsOptional()
  @IsNumber()
  estimated_duration?: number;

  @IsDateString()
  scheduled_date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
