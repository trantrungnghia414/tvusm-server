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

import { VenueModule } from './venue/venue.module';
import { Venue } from './venue/entities/venue.entity';

import { CourtType } from 'src/court-type/entities/court-type.entity';
import { CourtTypeModule } from 'src/court-type/court-type.module';

import { Court } from 'src/court/entities/court.entity';
import { CourtModule } from 'src/court/court.module';

import { CourtMapping } from 'src/court-mapping/entities/court-mapping.entity';
import { CourtMappingModule } from 'src/court-mapping/court-mapping.module';

import { Event } from 'src/events/entities/event.entity';
import { EventParticipant } from 'src/events/entities/event-participant.entity';
import { EventsModule } from 'src/events/events.module';

import { ScheduleModule } from '@nestjs/schedule';

import { News } from 'src/news/entities/news.entity';
import { NewsModule } from 'src/news/news.module';
import { NewsCategory } from 'src/news/entities/news-category.entity';

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
      entities: [
        User,
        Venue,
        CourtType,
        Court,
        CourtMapping,
        Event,
        EventParticipant,
        News,
        NewsCategory,
      ],
      synchronize: false, // Chỉ nên để true trong môi trường phát triển
    }),
    UserModule,
    AuthModule,
    MailModule,
    VenueModule,
    CourtTypeModule,
    CourtModule,
    CourtMappingModule,
    EventsModule,
    NewsModule,
    ConfigModule.forRoot({
      isGlobal: true, // Để biến môi trường có thể sử dụng ở bất kỳ đâu trong ứng dụng
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
