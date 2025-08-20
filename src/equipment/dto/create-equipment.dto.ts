import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EquipmentStatus } from '../entities/equipment.entity';

export class CreateEquipmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  category_id: number;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  purchase_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purchase_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  venue_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  court_id?: number;

  @IsOptional()
  @IsString()
  location_detail?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  warranty_expiry?: string;

  @IsOptional()
  @IsString()
  last_maintenance_date?: string;

  @IsOptional()
  @IsString()
  next_maintenance_date?: string;

  @IsOptional()
  @IsString()
  installation_date?: string;

  @IsOptional()
  @IsString()
  qr_code?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
