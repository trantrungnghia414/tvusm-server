import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { News, NewsStatus } from './entities/news.entity';
import { NewsCategory } from './entities/news-category.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { UpdateNewsStatusDto } from './dto/update-news-status.dto';
import * as fs from 'fs';
import { NewsViewService } from './news-view.service';
import { Request } from 'express';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    @InjectRepository(NewsCategory)
    private categoryRepository: Repository<NewsCategory>,
    private newsViewService: NewsViewService,
  ) {}

  // Truy vấn danh sách tin tức với thông tin category và author
  async findAll(search?: string) {
    const query = this.newsRepository
      .createQueryBuilder('news')
      .leftJoin('news.category', 'category')
      .leftJoin('news.author', 'author')
      .select([
        'news',
        'category.name',
        'author.fullname',
        'author.username',
        'author.avatar',
      ]);

    if (search) {
      query.where(
        'news.title LIKE :search OR news.summary LIKE :search OR news.content LIKE :search',
        { search: `%${search}%` },
      );
    }

    query.orderBy('news.created_at', 'DESC');
    const news = await query.getMany();

    // Đưa category_name và author_name vào kết quả trả về
    return news.map((item) => {
      const category_name = item.category ? item.category.name : null;
      const author_name = item.author ? item.author.fullname : null;
      const author_username = item.author ? item.author.username : null;
      const author_avatar = item.author ? item.author.avatar : null;

      // Tạo đối tượng mới không chứa author và category đầy đủ

      // Sửa: Bỏ qua biến category và author không dùng đến
      const { ...rest } = item;
      return {
        ...rest,
        category_name,
        author_name,
        author_username,
        author_avatar,
      };
    });
  }

  // Truy vấn tin tức chi tiết theo ID
  async findOne(news_id: number, req?: Request) {
    const news = await this.newsRepository
      .createQueryBuilder('news')
      .leftJoin('news.category', 'category')
      .leftJoin('news.author', 'author')
      .select([
        'news',
        'category.name',
        'author.fullname',
        'author.username',
        'author.avatar',
      ])
      .where('news.news_id = :news_id', { news_id })
      .getOne();

    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    // Tăng lượt xem nếu có request object
    if (req) {
      await this.newsViewService.incrementViewCount(news_id, req);
    }

    // Phần xử lý dữ liệu trả về vẫn giữ nguyên
    const category_name = news.category ? news.category.name : null;
    const author_name = news.author ? news.author.fullname : null;
    const author_username = news.author ? news.author.username : null;
    const author_avatar = news.author ? news.author.avatar : null;

    const { ...rest } = news;
    return {
      ...rest,
      category_name,
      author_name,
      author_username,
      author_avatar,
    };
  }

  // Truy vấn tin tức theo slug
  async findBySlug(slug: string, req?: Request) {
    const news = await this.newsRepository
      .createQueryBuilder('news')
      .leftJoin('news.category', 'category')
      .leftJoin('news.author', 'author')
      .select([
        'news',
        'category.name',
        'author.fullname',
        'author.username',
        'author.avatar',
      ])
      .where('news.slug = :slug', { slug })
      .getOne();

    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    // Tăng lượt xem nếu có request object
    if (req) {
      await this.newsViewService.incrementViewCount(news.news_id, req);
    }

    // Đưa category_name và author_name vào kết quả trả về
    const category_name = news.category ? news.category.name : null;
    const author_name = news.author ? news.author.fullname : null;
    const author_username = news.author ? news.author.username : null;
    const author_avatar = news.author ? news.author.avatar : null;

    // Tăng lượt xem
    await this.newsRepository.increment(
      { news_id: news.news_id },
      'view_count',
      1,
    );

    // Tạo đối tượng mới không chứa author và category đầy đủ
    // Sửa: Bỏ qua biến category và author không dùng đến
    const { ...rest } = news;
    return {
      ...rest,
      category_name,
      author_name,
      author_username,
      author_avatar,
    };
  }

  // Tạo tin tức mới
  async create(
    createNewsDto: CreateNewsDto,
    author_id: number,
    thumbnailPath?: string,
  ) {
    // Kiểm tra category có tồn tại không
    const categoryExists = await this.categoryRepository.findOneBy({
      category_id: createNewsDto.category_id,
    });
    if (!categoryExists) {
      throw new BadRequestException('Danh mục không tồn tại');
    }

    // Kiểm tra slug đã tồn tại chưa
    const slugExists = await this.newsRepository.findOneBy({
      slug: createNewsDto.slug,
    });
    if (slugExists) {
      throw new BadRequestException('Slug đã tồn tại, vui lòng chọn slug khác');
    }

    // Tạo đối tượng news mới
    // Sửa: Thay đổi từ null sang undefined cho published_at
    const news = this.newsRepository.create({
      ...createNewsDto,
      author_id,
      thumbnail: thumbnailPath,
      // Nếu status = PUBLISHED thì set published_at là hiện tại, ngược lại để undefined
      published_at:
        createNewsDto.status === NewsStatus.PUBLISHED ? new Date() : undefined,
    });

    return this.newsRepository.save(news);
  }

  // Cập nhật tin tức
  async update(
    news_id: number,
    updateNewsDto: UpdateNewsDto,
    author_id: number,
    thumbnailPath?: string,
    isAdmin = false,
  ) {
    // Kiểm tra tin tức có tồn tại không
    const news = await this.newsRepository.findOneBy({ news_id });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    // Kiểm tra quyền cập nhật (chỉ tác giả hoặc admin mới được cập nhật)
    if (news.author_id !== author_id && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật tin tức của người khác',
      );
    }

    // Kiểm tra slug nếu có cập nhật
    if (updateNewsDto.slug && updateNewsDto.slug !== news.slug) {
      const slugExists = await this.newsRepository.findOneBy({
        slug: updateNewsDto.slug,
      });
      if (slugExists) {
        throw new BadRequestException(
          'Slug đã tồn tại, vui lòng chọn slug khác',
        );
      }
    }

    // Kiểm tra category nếu có cập nhật
    if (updateNewsDto.category_id) {
      const categoryExists = await this.categoryRepository.findOneBy({
        category_id: updateNewsDto.category_id,
      });
      if (!categoryExists) {
        throw new BadRequestException('Danh mục không tồn tại');
      }
    }

    // Xử lý trường hợp xuất bản tin tức
    let publishedAt = news.published_at;
    if (
      updateNewsDto.status === NewsStatus.PUBLISHED &&
      news.status !== NewsStatus.PUBLISHED
    ) {
      publishedAt = new Date();
    }

    // Nếu cập nhật ảnh mới và có ảnh cũ, xóa ảnh cũ
    if (thumbnailPath && news.thumbnail) {
      try {
        // Chỉ xóa nếu ảnh hiện tại là upload file (không phải đường dẫn URL)
        if (
          !news.thumbnail.startsWith('http') &&
          fs.existsSync(`.${news.thumbnail}`)
        ) {
          fs.unlinkSync(`.${news.thumbnail}`);
          console.log(`Đã xóa ảnh cũ: ${news.thumbnail}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa file ảnh cũ:', error);
        // Vẫn tiếp tục cập nhật ngay cả khi xóa ảnh thất bại
      }
    }

    // Cập nhật thông tin tin tức
    await this.newsRepository.update(
      { news_id },
      {
        ...updateNewsDto,
        published_at: publishedAt,
        thumbnail: thumbnailPath || news.thumbnail,
      },
    );

    return this.findOne(news_id);
  }

  // Cập nhật trạng thái tin tức
  async updateStatus(
    news_id: number,
    updateNewsStatusDto: UpdateNewsStatusDto,
    author_id: number,
    isAdmin = false,
  ) {
    // Kiểm tra tin tức có tồn tại không
    const news = await this.newsRepository.findOneBy({ news_id });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    // Kiểm tra quyền cập nhật (chỉ tác giả hoặc admin mới được cập nhật)
    if (news.author_id !== author_id && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật trạng thái tin tức của người khác',
      );
    }

    // Xử lý trường hợp xuất bản tin tức
    let publishedAt = news.published_at;
    if (
      updateNewsStatusDto.status === NewsStatus.PUBLISHED &&
      news.status !== NewsStatus.PUBLISHED
    ) {
      publishedAt = new Date();
    }

    // Cập nhật trạng thái tin tức
    await this.newsRepository.update(
      { news_id },
      {
        status: updateNewsStatusDto.status,
        published_at: publishedAt,
      },
    );

    return this.findOne(news_id);
  }

  // Xóa tin tức
  async remove(news_id: number, author_id: number, isAdmin = false) {
    // Kiểm tra tin tức có tồn tại không
    const news = await this.newsRepository.findOneBy({ news_id });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    // Kiểm tra quyền xóa (chỉ tác giả hoặc admin mới được xóa)
    if (news.author_id !== author_id && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa tin tức của người khác',
      );
    }

    // Xóa ảnh thumbnail từ filesystem nếu có
    if (news.thumbnail && !news.thumbnail.startsWith('http')) {
      try {
        const imagePath = `.${news.thumbnail}`;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Đã xóa ảnh thumbnail: ${news.thumbnail}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa file ảnh thumbnail:', error);
        // Tiếp tục xóa tin tức ngay cả khi xóa file ảnh thất bại
      }
    }

    // Thực hiện xóa tin tức
    await this.newsRepository.delete({ news_id });
    return { message: 'Xóa tin tức thành công' };
  }

  // Tìm các tin tức nổi bật
  async findFeatured(limit = 5) {
    return this.newsRepository.find({
      where: {
        is_featured: 1,
        status: NewsStatus.PUBLISHED,
      },
      order: {
        published_at: 'DESC',
      },
      take: limit,
    });
  }

  // Tìm các tin tức mới nhất
  async findLatest(limit = 10) {
    return this.newsRepository.find({
      where: {
        status: NewsStatus.PUBLISHED,
      },
      order: {
        published_at: 'DESC',
      },
      take: limit,
    });
  }

  // Lấy danh sách danh mục tin tức
  async findAllCategories() {
    return this.categoryRepository.find({
      where: {
        is_active: 1,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  // Tạo danh mục tin tức mới
  async createCategory(name: string, slug: string, description?: string) {
    // Kiểm tra slug đã tồn tại chưa
    const slugExists = await this.categoryRepository.findOneBy({ slug });
    if (slugExists) {
      throw new BadRequestException('Slug đã tồn tại, vui lòng chọn slug khác');
    }

    const category = this.categoryRepository.create({
      name,
      slug,
      description,
      is_active: 1,
    });

    return this.categoryRepository.save(category);
  }

  // Lấy tin tức theo danh mục
  async findByCategory(categoryId: number, limit = 10) {
    // Kiểm tra danh mục có tồn tại không
    const categoryExists = await this.categoryRepository.findOneBy({
      category_id: categoryId,
      is_active: 1,
    });
    if (!categoryExists) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    return this.newsRepository.find({
      where: {
        category_id: categoryId,
        status: NewsStatus.PUBLISHED,
      },
      order: {
        published_at: 'DESC',
      },
      take: limit,
    });
  }

  // Tìm kiếm tin tức
  async search(query: string, limit = 10) {
    if (!query) {
      return [];
    }

    return this.newsRepository.find({
      where: [
        { title: Like(`%${query}%`), status: NewsStatus.PUBLISHED },
        { content: Like(`%${query}%`), status: NewsStatus.PUBLISHED },
        { summary: Like(`%${query}%`), status: NewsStatus.PUBLISHED },
      ],
      order: {
        published_at: 'DESC',
      },
      take: limit,
    });
  }
}
