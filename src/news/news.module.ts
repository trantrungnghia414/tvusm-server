import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { NewsController } from './news.controller';
// import { NewsService } from './news.service';
import { News } from './entities/news.entity';
import { NewsCategory } from './entities/news-category.entity';
// import { User } from '../users/entities/user.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { User } from 'src/user/entities/user.entity';
import { NewsController } from 'src/news/news.controller';
import { NewsService } from 'src/news/news.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([News, NewsCategory, User]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/news',
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên để tránh trùng lặp
          const randomName = uuidv4();
          // Lấy phần mở rộng của file gốc
          const ext = extname(file.originalname);
          cb(null, `${randomName}${ext}`);
        },
      }),
    }),
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
