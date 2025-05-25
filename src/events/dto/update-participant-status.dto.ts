import { IsEnum, IsNotEmpty } from 'class-validator';
import { ParticipantStatus } from '../entities/event-participant.entity';

export class UpdateParticipantStatusDto {
  @IsEnum(ParticipantStatus)
  @IsNotEmpty()
  status: ParticipantStatus;
}
