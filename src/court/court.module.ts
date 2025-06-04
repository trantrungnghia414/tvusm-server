import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';
import { Court } from './entities/court.entity';
import { CourtMapping } from '../court-mapping/entities/court-mapping.entity';
import { Booking } from '../booking/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court, CourtMapping, Booking])],
  controllers: [CourtController],
  providers: [CourtService],
  exports: [CourtService],
})
export class CourtModule {}
