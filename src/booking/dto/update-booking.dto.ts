import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status?: 'pending' | 'paid' | 'refunded';
}
