import { IsEnum, IsNotEmpty } from 'class-validator';
import { EquipmentStatus } from '../entities/equipment.entity';

export class UpdateEquipmentStatusDto {
  @IsNotEmpty()
  @IsEnum(EquipmentStatus)
  status: EquipmentStatus;
}
