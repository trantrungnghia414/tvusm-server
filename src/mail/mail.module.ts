// File này định nghĩa module cho MailService
// và cấu hình để sử dụng trong ứng dụng NestJS

import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // Export để có thể sử dụng ở module khác
})
export class MailModule {}
