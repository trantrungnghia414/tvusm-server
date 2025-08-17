import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayReturnDto } from './dto/vnpay-return.dto';
import { VnpayService } from './vnpay.service';
import { BookingService } from '../booking/booking.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private vnpayService: VnpayService,
    private bookingService: BookingService,
    private notificationService: NotificationService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      console.log('🔍 Creating payment with data:', createPaymentDto);

      // ✅ Validate required fields
      if (!createPaymentDto.user_id) {
        throw new BadRequestException('User ID is required');
      }

      if (!createPaymentDto.amount || createPaymentDto.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      const payment = this.paymentRepository.create({
        ...createPaymentDto,
        amount: Number(createPaymentDto.amount), // ✅ Ensure amount is number
        status: PaymentStatus.PENDING,
        created_at: new Date(),
      });

      const savedPayment = await this.paymentRepository.save(payment);
      console.log('✅ Payment created successfully:', savedPayment);

      return savedPayment;
    } catch (error) {
      console.error('❌ Error creating payment:', error);
      throw error;
    }
  }

  async createVnpayPayment(
    createPaymentDto: CreatePaymentDto,
    ipAddr: string,
  ): Promise<{ paymentUrl: string; payment: Payment }> {
    try {
      console.log('🔍 CreateVnpayPayment data:', createPaymentDto);

      // ✅ Validate amount
      const amount = Number(createPaymentDto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('Số tiền thanh toán không hợp lệ');
      }

      console.log('💰 Validated amount:', amount);

      // ✅ Tạo payment record với amount đã validate
      const paymentData = {
        ...createPaymentDto,
        amount: amount,
        payment_method: PaymentMethod.VNPAY,
      };

      const payment = await this.create(paymentData);

      // Generate transaction reference
      const txnRef = this.vnpayService.generateTxnRef();

      // Update payment với vnp_txn_ref
      payment.vnp_txn_ref = txnRef;
      payment.transaction_id = `PAY_${payment.payment_id}_${txnRef}`;
      await this.paymentRepository.save(payment);

      // Tạo order info
      let orderInfo = `Thanh toan don hang ${payment.payment_id}`;
      if (payment.booking_id) {
        orderInfo = `Thanh toan dat san booking ${payment.booking_id}`;
      }

      console.log('💳 Creating VNPay URL with amount:', amount);

      // Tạo VNPay payment URL - không truyền return_url để sử dụng config mặc định
      const paymentUrl = this.vnpayService.createPaymentUrl(
        amount,
        orderInfo,
        txnRef,
        ipAddr,
        undefined, // ✅ Luôn sử dụng return_url từ config
      );

      console.log('🔗 Generated payment URL:', paymentUrl);

      return { paymentUrl, payment };
    } catch (error) {
      console.error('❌ Error creating VNPay payment:', error);
      throw error;
    }
  }

  async handleVnpayReturn(returnData: VnpayReturnDto): Promise<Payment> {
    try {
      // Verify return URL
      const isValid = this.vnpayService.verifyReturnUrl(
        returnData as unknown as Record<string, string>,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid VNPay return signature');
      }

      // Tìm payment theo vnp_TxnRef
      const payment = await this.paymentRepository.findOne({
        where: { vnp_txn_ref: returnData.vnp_TxnRef },
        relations: ['booking', 'user'],
      });

      if (!payment) {
        throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
      }

      // Cập nhật payment status
      payment.vnp_transaction_no = returnData.vnp_TransactionNo;
      payment.vnp_response_code = returnData.vnp_ResponseCode;
      payment.vnp_secure_hash = returnData.vnp_SecureHash;
      payment.payment_data = returnData;

      if (returnData.vnp_ResponseCode === '00') {
        // Thanh toán thành công
        payment.status = PaymentStatus.COMPLETED;
        payment.paid_at = new Date();

        // Cập nhật booking payment status nếu có
        if (payment.booking_id) {
          await this.bookingService.updatePaymentStatus(
            payment.booking_id,
            'paid',
          );
        }

        // Tạo thông báo thành công
        if (payment.user_id) {
          await this.notificationService.createPaymentNotification(
            payment.user_id,
            payment.payment_id,
            'success',
            payment.amount,
            payment.booking?.booking_code || `PAY-${payment.payment_id}`,
          );
        }
      } else {
        // Thanh toán thất bại
        payment.status = PaymentStatus.FAILED;

        // Tạo thông báo thất bại
        if (payment.user_id) {
          await this.notificationService.createPaymentNotification(
            payment.user_id,
            payment.payment_id,
            'failed',
            payment.amount,
            payment.booking?.booking_code || `PAY-${payment.payment_id}`,
          );
        }
      }

      return await this.paymentRepository.save(payment);
    } catch (error) {
      console.error('Error handling VNPay return:', error);
      throw error;
    }
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['user', 'booking'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { payment_id: id },
      relations: ['user', 'booking'],
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với id ${id}`);
    }

    return payment;
  }

  async findByUser(userId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { user_id: userId },
      relations: ['booking'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: PaymentStatus): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = status;

    if (status === PaymentStatus.COMPLETED) {
      payment.paid_at = new Date();
    }

    return this.paymentRepository.save(payment);
  }

  async updatePaidAt(id: number, paidAt: Date): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.paid_at = paidAt;
    payment.updated_at = new Date();
    return this.paymentRepository.save(payment);
  }

  async updatePayment(
    id: number,
    updateData: { status?: PaymentStatus; paid_at?: string },
  ): Promise<Payment> {
    const payment = await this.findOne(id);

    if (updateData.status) {
      payment.status = updateData.status;

      // Nếu status thành completed thì tự động set paid_at
      if (updateData.status === PaymentStatus.COMPLETED && !payment.paid_at) {
        payment.paid_at = new Date();
      }
    }

    if (updateData.paid_at) {
      payment.paid_at = new Date(updateData.paid_at);
    }

    payment.updated_at = new Date();
    return this.paymentRepository.save(payment);
  }
}
