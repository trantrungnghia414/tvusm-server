import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
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
        name: 'ASC',
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

      // Sử dụng delete thay vì remove để không tải entities liên quan
      await this.venueRepository.delete(id);
    } catch (error) {
      console.error('Lỗi khi xóa nhà thi đấu:', error);
      throw new NotFoundException(
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
