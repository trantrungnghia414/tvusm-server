// File này định nghĩa MailService, nơi xử lý việc gửi email xác thực tài khoản và đặt lại mật khẩu
// và cấu hình để sử dụng trong ứng dụng NestJS

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  // Khởi tạo transporter với thông tin tài khoản Gmail và mật khẩu
  // Sử dụng ConfigService để lấy thông tin từ biến môi trường
  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  // Gửi mã xác thực tài khoản
  // Sử dụng async/await để xử lý bất đồng bộ
  async sendVerificationCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: '"TVU Sports Center" <noreply@tvu.edu.vn>',
      to: email,
      subject: 'Mã xác thực tài khoản của bạn',
      html: `
        <h2>Xác thực email của bạn</h2>
        <p>Mã xác thực của bạn là:</p>
        <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        <p>Mã này sẽ hết hạn sau 15 phút.</p>
        <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
      `,
    });
  }

  // Gửi email đặt lại mật khẩu
  // Sử dụng async/await để xử lý bất đồng bộ
  async sendResetPasswordCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: '"TVU Sports Center" <noreply@tvu.edu.vn>',
      to: email,
      subject: 'Mã đặt lại mật khẩu',
      html: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã bên dưới để tiếp tục:</p>
      <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 4px;">${code}</h1>
      <p>Mã này sẽ hết hạn sau 15 phút.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    `,
    });
  }
}
