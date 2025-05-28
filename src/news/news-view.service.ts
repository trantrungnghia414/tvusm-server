import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from './entities/news.entity';
import { Request } from 'express';

@Injectable()
export class NewsViewService {
  private viewCache: Map<string, number> = new Map();
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 giờ

  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
  ) {
    // Định kỳ xóa cache để tránh memory leak
    setInterval(() => this.cleanupCache(), this.CACHE_EXPIRY);
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.viewCache.entries()) {
      if (now - timestamp > this.CACHE_EXPIRY) {
        this.viewCache.delete(key);
      }
    }
  }

  async incrementViewCount(newsId: number, req: Request): Promise<boolean> {
    try {
      // Lấy IP của người dùng, ưu tiên X-Forwarded-For nếu có
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',').shift() ||
        req.socket.remoteAddress ||
        'unknown';

      const userAgent = req.headers['user-agent'] || 'unknown';

      // Bỏ qua bots và crawlers
      if (this.isCrawler(userAgent)) {
        return false;
      }

      // Tạo khóa duy nhất cho mỗi kết hợp IP, news_id
      const cacheKey = `${newsId}:${ip}`;
      const now = Date.now();

      // Nếu đã có trong cache và chưa hết hạn, không tăng lượt xem
      if (this.viewCache.has(cacheKey)) {
        return false;
      }

      // Lưu vào cache với timestamp hiện tại
      this.viewCache.set(cacheKey, now);

      // Tăng lượt xem trong database
      await this.newsRepository.increment({ news_id: newsId }, 'view_count', 1);

      return true;
    } catch (error) {
      console.error('Error incrementing view count:', error);
      return false;
    }
  }

  private isCrawler(userAgent: string): boolean {
    const crawlerPatterns = [
      'bot',
      'spider',
      'crawl',
      'slurp',
      'bingbot',
      'googlebot',
      'yandexbot',
      'ahrefsbot',
      'semrushbot',
    ];

    userAgent = userAgent.toLowerCase();
    return crawlerPatterns.some((pattern) => userAgent.includes(pattern));
  }
}
