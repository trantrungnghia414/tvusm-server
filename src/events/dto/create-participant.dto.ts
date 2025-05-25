import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ParticipantStatus } from '../entities/event-participant.entity';

export class CreateParticipantDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsEnum(ParticipantStatus)
  status?: ParticipantStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
