import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsOptional()
  @IsNumber()
  booking_id?: number;

  @IsOptional() // ✅ Thay đổi user_id thành optional
  @IsNumber()
  user_id?: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  return_url?: string;
}
