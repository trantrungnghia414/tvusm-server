import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEquipmentIssueDto {
  @IsNumber()
  equipment_id: number;

  @IsEnum([
    'broken',
    'malfunction',
    'maintenance_needed',
    'missing',
    'damaged',
  ] as const)
  issue_type:
    | 'broken'
    | 'malfunction'
    | 'maintenance_needed'
    | 'missing'
    | 'damaged';

  @IsEnum(['low', 'medium', 'high', 'critical'] as const)
  severity: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location_when_found?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;
}
