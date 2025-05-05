import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { MailService } from './mail/mail.service';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // Kết nối đến cơ sở dữ liệu MySQL
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'tvu_sports_center',
      entities: [User],
      synchronize: false, // Chỉ nên để true trong môi trường phát triển
    }),
    UserModule,
    AuthModule,
    MailModule,
    ConfigModule.forRoot({
      isGlobal: true, // Để biến môi trường có thể sử dụng ở bất kỳ đâu trong ứng dụng
    }),
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
