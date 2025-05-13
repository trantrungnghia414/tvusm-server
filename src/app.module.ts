import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

import { MailModule } from 'src/mail/mail.module';
import { MailService } from './mail/mail.service';

import { User } from 'src/user/entities/user.entity';
import { UserModule } from './user/user.module';
import { VenueModule } from './venue/venue.module'; // Import VenueModule
import { Venue } from './venue/entities/venue.entity'; // Import Venue entity

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // Kết nối đến cơ sở dữ liệu MySQL
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'tvusm_db',
      entities: [User, Venue], // Thêm Venue entity vào danh sách
      synchronize: false, // Chỉ nên để true trong môi trường phát triển
    }),
    UserModule,
    AuthModule,
    MailModule,
    VenueModule, // Đăng ký VenueModule
    ConfigModule.forRoot({
      isGlobal: true, // Để biến môi trường có thể sử dụng ở bất kỳ đâu trong ứng dụng
    }),
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
