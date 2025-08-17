// filepath: d:\PROJECT_TN\stadium-management-tvuhub\server\src\payment\vnpay.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VnpayService {
  private readonly vnp_TmnCode: string;
  private readonly vnp_HashSecret: string;
  private readonly vnp_Url: string;
  private readonly vnp_ReturnUrl: string;

  constructor(private configService: ConfigService) {
    // VNPay test credentials
    this.vnp_TmnCode = this.configService.get<string>(
      'VNPAY_TMN_CODE',
      'TESTMERCHANT01',
    );
    this.vnp_HashSecret = this.configService.get<string>(
      'VNPAY_HASH_SECRET',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
    );
    this.vnp_Url = this.configService.get<string>(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    this.vnp_ReturnUrl = this.configService.get<string>(
      'VNPAY_RETURN_URL',
      'http://localhost:3001/api/payments/vnpay/return',
    );
  }

  createPaymentUrl(
    amount: number,
    orderInfo: string,
    txnRef: string,
    ipAddr: string,
    returnUrl?: string,
  ): string {
    console.log('🔍 VNPay config check:');
    console.log('- TMN_CODE:', this.vnp_TmnCode);
    console.log('- HASH_SECRET:', this.vnp_HashSecret.substring(0, 5) + '***');
    console.log('- URL:', this.vnp_Url);
    console.log('- Return URL:', returnUrl || this.vnp_ReturnUrl);

    // ✅ Sử dụng Date thay vì moment để tránh lỗi type
    const now = new Date();
    const createDate = this.formatDateTime(now);
    const expireTime = new Date(now.getTime() + 15 * 60 * 1000); // Thêm 15 phút
    const expireDate = this.formatDateTime(expireTime);

    // ✅ Sử dụng const thay vì let vì object không bị reassign
    const vnp_Params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnp_TmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: (amount * 100).toString(), // VNPay yêu cầu amount * 100
      vnp_ReturnUrl: returnUrl || this.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    console.log('📝 VNPay params before sorting:', vnp_Params);

    // Sắp xếp params theo thứ tự alphabet
    const sortedParams = this.sortObject(vnp_Params);
    console.log('📝 VNPay params after sorting:', sortedParams);

    // Tạo query string
    const signData = new URLSearchParams(sortedParams).toString();
    console.log('🔐 Sign data string:', signData);

    // Tạo secure hash
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    console.log('🔐 Generated signature:', signed);

    vnp_Params['vnp_SecureHash'] = signed;

    // Tạo URL thanh toán
    const paymentUrl =
      this.vnp_Url + '?' + new URLSearchParams(vnp_Params).toString();

    console.log('🔗 Final payment URL:', paymentUrl);

    return paymentUrl;
  }

  verifyReturnUrl(vnp_Params: Record<string, string>): boolean {
    const secureHash = vnp_Params['vnp_SecureHash'];
    // ✅ Tạo copy của object để tránh mutate original
    const paramsToVerify = { ...vnp_Params };
    delete paramsToVerify['vnp_SecureHash'];
    delete paramsToVerify['vnp_SecureHashType'];

    const sortedParams = this.sortObject(paramsToVerify);
    const signData = new URLSearchParams(sortedParams).toString();

    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();

    keys.forEach((key) => {
      sorted[key] = obj[key];
    });

    return sorted;
  }

  generateTxnRef(): string {
    // ✅ Sử dụng Date thay vì moment
    const now = new Date();
    const dateTimeString = this.formatDateTime(now);
    const randomNumber = Math.floor(Math.random() * 1000);
    return dateTimeString + randomNumber.toString();
  }

  // ✅ Helper method để format datetime
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
}
