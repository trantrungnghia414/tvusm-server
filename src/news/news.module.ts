import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsViewService } from './news-view.service';
import { News } from './entities/news.entity';
import { NewsCategory } from './entities/news-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([News, NewsCategory])],
  controllers: [NewsController],
  providers: [NewsService, NewsViewService],
  exports: [NewsService],
})
export class NewsModule {}
