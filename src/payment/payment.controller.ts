import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
  Response,
  Res, // ✅ Thêm Res import
  BadRequestException, // ✅ Thêm BadRequestException import
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express'; // ✅ Import Express Response type
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayReturnDto } from './dto/vnpay-return.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentStatus } from './entities/payment.entity';

// ✅ Interface cho authenticated request
interface AuthenticatedRequest {
  user: {
    user_id: number; // ✅ Sử dụng user_id thay vì userId
    username: string;
    role: string;
  };
}

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly vnpayService: VnpayService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentService.create({
      ...createPaymentDto,
      user_id: req.user.user_id,
    });
  }

  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  async createVnpayPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: AuthenticatedRequest,
    @Ip() ipAddr: string,
  ) {
    console.log('💳 Received payment request:', createPaymentDto);
    console.log('👤 User from token:', req.user);
    console.log('🔍 user_id from body:', createPaymentDto.user_id);
    console.log('🔍 user_id from JWT:', req.user.user_id);

    // ✅ Validate amount trước khi xử lý
    if (!createPaymentDto.amount || createPaymentDto.amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán không hợp lệ');
    }

    // ✅ Đảm bảo user_id được lấy từ JWT token (override từ body)
    const paymentData = {
      ...createPaymentDto,
      user_id: req.user.user_id, // ✅ Luôn dùng user_id từ JWT token
      amount: Number(createPaymentDto.amount), // ✅ Đảm bảo amount là số
    };

    console.log('💳 Final payment data:', paymentData);

    const result = await this.paymentService.createVnpayPayment(
      paymentData,
      ipAddr,
    );

    return {
      success: true,
      paymentUrl: result.paymentUrl,
      paymentId: result.payment.payment_id,
      message: 'Tạo thanh toán VNPay thành công',
    };
  }

  @Get('vnpay/return')
  async vnpayReturn(
    @Query() query: VnpayReturnDto,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    try {
      console.log('🔄 VNPay return callback received:', query);

      const payment = await this.paymentService.handleVnpayReturn(query);
      console.log('✅ Payment processed:', payment);

      // ✅ Xác định URL redirect dựa trên kết quả thanh toán
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      let redirectUrl: string;

      if (payment.status === PaymentStatus.COMPLETED) {
        redirectUrl = `${frontendUrl}/payment/result?status=completed&paymentId=${payment.payment_id}`;
      } else {
        redirectUrl = `${frontendUrl}/payment/result?status=failed&paymentId=${payment.payment_id}&error=${encodeURIComponent('Thanh toán không thành công')}`;
      }

      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ VNPay return error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const redirectUrl = `${frontendUrl}/payment/result?status=failed&error=${encodeURIComponent(errorMessage)}`;

      res.redirect(redirectUrl);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  findMyPayments(@Request() req: AuthenticatedRequest) {
    return this.paymentService.findByUser(req.user.user_id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(+id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  updateStatus(@Param('id') id: string, @Body('status') status: PaymentStatus) {
    return this.paymentService.updateStatus(+id, status);
  }

  // ✅ Thêm endpoint PATCH /payments/:id để cập nhật payment từ admin dashboard
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async updatePayment(
    @Param('id') id: string,
    @Body() updateData: { status?: PaymentStatus; paid_at?: string },
  ) {
    const paymentId = +id;

    // Sử dụng method updatePayment từ service
    return this.paymentService.updatePayment(paymentId, updateData);
  }
}
