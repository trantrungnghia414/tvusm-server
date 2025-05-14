import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtTypeService } from './court-type.service';
import { CourtTypeController } from './court-type.controller';
import { CourtType } from './entities/court-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourtType])],
  controllers: [CourtTypeController],
  providers: [CourtTypeService],
  exports: [CourtTypeService],
})
export class CourtTypeModule {}
