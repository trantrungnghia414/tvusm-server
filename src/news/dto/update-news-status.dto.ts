import { IsEnum, IsNotEmpty } from 'class-validator';
import { NewsStatus } from '../entities/news.entity';

export class UpdateNewsStatusDto {
  @IsNotEmpty()
  @IsEnum(NewsStatus)
  status: NewsStatus;
}
