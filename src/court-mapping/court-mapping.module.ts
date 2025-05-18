import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtMappingService } from './court-mapping.service';
import { CourtMappingController } from './court-mapping.controller';
import { CourtMapping } from './entities/court-mapping.entity';
import { Court } from '../court/entities/court.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourtMapping, Court])],
  controllers: [CourtMappingController],
  providers: [CourtMappingService],
  exports: [CourtMappingService],
})
export class CourtMappingModule {}
