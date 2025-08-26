import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { ReportsController } from './reports.controller';
// import { ReportsService } from './reports.service';
import { Booking } from '../booking/entities/booking.entity';
import { User } from '../user/entities/user.entity';
import { Court } from '../court/entities/court.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Venue } from '../venue/entities/venue.entity';
import { CourtType } from '../court-type/entities/court-type.entity';
import { ReportsController } from 'src/reports/reports.controller';
import { ReportsService } from 'src/reports/reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, User, Court, Payment, Venue, CourtType]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
