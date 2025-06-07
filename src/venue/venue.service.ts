import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import * as fs from 'fs';
import { DataSource } from 'typeorm';

// Định nghĩa interface cho kết quả truy vấn count
interface CountResult {
  count: number;
}

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    private dataSource: DataSource, // Thêm DataSource để thực hiện raw query
  ) {}

  // Tạo nhà thi đấu mới
  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    const newVenue = this.venueRepository.create(createVenueDto);
    return this.venueRepository.save(newVenue);
  }

  // Lấy danh sách tất cả nhà thi đấu
  async findAll(): Promise<Venue[]> {
    return this.venueRepository.find({
      order: {
        // name: 'ASC', // Sắp xếp theo tên nhà thi đấu
        created_at: 'DESC', // Sắp xếp theo ngày tạo mới nhất
      },
    });
  }

  // Lấy thông tin chi tiết một nhà thi đấu
  async findOne(id: number): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { venue_id: id },
      // relations: ['courts'], // Lấy cả thông tin về các sân trong nhà thi đấu
    });

    if (!venue) {
      throw new NotFoundException(`Không tìm thấy nhà thi đấu với id ${id}`);
    }

    return venue;
  }

  // Cập nhật thông tin nhà thi đấu
  async update(id: number, updateVenueDto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.findOne(id);

    // Nếu cập nhật ảnh mới và có ảnh cũ, xóa ảnh cũ
    if (updateVenueDto.image && venue.image) {
      try {
        // Chỉ xóa nếu ảnh hiện tại là upload file (không phải đường dẫn URL)
        if (
          venue.image &&
          !venue.image.startsWith('http') &&
          fs.existsSync(`.${venue.image}`)
        ) {
          fs.unlinkSync(`.${venue.image}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa file ảnh cũ:', error);
      }
    }

    // Cập nhật thông tin mới
    Object.assign(venue, updateVenueDto);
    return this.venueRepository.save(venue);
  }

  // Xóa nhà thi đấu
  async remove(id: number): Promise<void> {
    try {
      const venue = await this.findOne(id);

      // Kiểm tra xem nhà thi đấu có sân nào không
      const courtsCount = await this.dataSource.query<CountResult[]>(
        'SELECT COUNT(*) as count FROM courts WHERE venue_id = ?',
        [id],
      );

      if (courtsCount[0].count > 0) {
        throw new ConflictException(
          `Không thể xóa nhà thi đấu này vì có ${courtsCount[0].count} sân thể thao đang liên kết với nó. Vui lòng xóa sân trước.`,
        );
      }

      // Kiểm tra xem nhà thi đấu có sự kiện nào không
      const eventsCount = await this.dataSource.query<CountResult[]>(
        'SELECT COUNT(*) as count FROM events WHERE venue_id = ?',
        [id],
      );

      if (eventsCount[0].count > 0) {
        throw new ConflictException(
          `Không thể xóa nhà thi đấu này vì có ${eventsCount[0].count} sự kiện đang liên kết với nó. Vui lòng xóa hoặc chuyển sự kiện sang nhà thi đấu khác trước.`,
        );
      }

      // Kiểm tra xem nhà thi đấu có thiết bị nào không
      const equipmentCount = await this.dataSource.query<CountResult[]>(
        'SELECT COUNT(*) as count FROM equipment WHERE venue_id = ?',
        [id],
      );

      if (equipmentCount[0].count > 0) {
        throw new ConflictException(
          `Không thể xóa nhà thi đấu này vì có ${equipmentCount[0].count} thiết bị đang liên kết với nó. Vui lòng chuyển thiết bị sang địa điểm khác trước.`,
        );
      }

      // Xóa file ảnh nếu có
      if (
        venue.image &&
        !venue.image.startsWith('http') &&
        fs.existsSync(`.${venue.image}`)
      ) {
        try {
          fs.unlinkSync(`.${venue.image}`);
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh:', error);
          // Tiếp tục quá trình xóa venue mặc dù xóa ảnh thất bại
        }
      }

      // Xóa nhà thi đấu nếu không có dữ liệu liên quan
      await this.venueRepository.delete(id);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('Lỗi khi xóa nhà thi đấu:', error);
      throw new InternalServerErrorException(
        `Không thể xóa nhà thi đấu với id ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Cập nhật trạng thái nhà thi đấu
  async updateStatus(
    id: number,
    status: 'active' | 'maintenance' | 'inactive',
  ): Promise<Venue> {
    const venue = await this.findOne(id);
    venue.status = status;
    return this.venueRepository.save(venue);
  }
}
