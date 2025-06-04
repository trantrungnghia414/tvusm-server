import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Court } from '../court/entities/court.entity';
import { CourtMapping } from '../court-mapping/entities/court-mapping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Court, CourtMapping])],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
