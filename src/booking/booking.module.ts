import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Court } from '../court/entities/court.entity';
import { CourtMapping } from '../court-mapping/entities/court-mapping.entity';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module'; // ✅ Import AuthModule
import { PaymentModule } from '../payment/payment.module'; // ✅ Import PaymentModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Court, CourtMapping]),
    NotificationModule,
    AuthModule, // ✅ Thêm AuthModule để có JwtService
    forwardRef(() => PaymentModule), // ✅ Thêm PaymentModule với forwardRef để tránh circular dependency
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
