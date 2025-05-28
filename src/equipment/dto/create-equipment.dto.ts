import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  Min,
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

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  available_quantity: number;

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
  rental_fee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  venue_id?: number;
}
