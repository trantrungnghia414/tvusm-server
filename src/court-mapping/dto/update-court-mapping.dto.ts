import { PartialType } from '@nestjs/mapped-types';
import { CreateCourtMappingDto } from './create-court-mapping.dto';

export class UpdateCourtMappingDto extends PartialType(CreateCourtMappingDto) {}
