import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Court } from './entities/court.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import {
  CourtQueryResult,
  CourtResponse,
} from './interfaces/court-query-result.interface';

@Injectable()
export class CourtService {
  constructor(
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
  ) {}

  async create(createCourtDto: CreateCourtDto): Promise<Court> {
    try {
      // Kiểm tra mã code đã tồn tại chưa
      const existingCourt = await this.courtRepository.findOne({
        where: { code: createCourtDto.code },
      });

      if (existingCourt) {
        throw new ConflictException(
          `Mã sân '${createCourtDto.code}' đã tồn tại`,
        );
      }

      const newCourt = this.courtRepository.create(createCourtDto);
      return this.courtRepository.save(newCourt);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể tạo sân: ${errorMessage}`,
      );
    }
  }

  async findAll(): Promise<CourtResponse[]> {
    try {
      const courts = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.type', 'type')
        .select([
          'court.*',
          'venue.name AS venue_name',
          'type.name AS type_name',
        ])
        .getRawMany<CourtQueryResult>();

      return courts.map(
        (court: CourtQueryResult): CourtResponse => ({
          court_id: court.court_id,
          name: court.name,
          code: court.code,
          hourly_rate: court.hourly_rate,
          description: court.description,
          status: court.status,
          image: court.image,
          is_indoor: court.is_indoor,
          created_at: court.created_at,
          updated_at: court.updated_at,
          venue_id: court.venue_id,
          type_id: court.type_id,
          venue_name: court.venue_name,
          type_name: court.type_name,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân: ${errorMessage}`,
      );
    }
  }

  async findOne(id: number): Promise<CourtResponse> {
    try {
      const court = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.type', 'type')
        .where('court.court_id = :id', { id })
        .select([
          'court.*',
          'venue.name AS venue_name',
          'type.name AS type_name',
        ])
        .getRawOne<CourtQueryResult>();

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      return {
        court_id: court.court_id,
        name: court.name,
        code: court.code,
        hourly_rate: court.hourly_rate,
        description: court.description,
        status: court.status,
        image: court.image,
        is_indoor: court.is_indoor,
        created_at: court.created_at,
        updated_at: court.updated_at,
        venue_id: court.venue_id,
        type_id: court.type_id,
        venue_name: court.venue_name,
        type_name: court.type_name,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể tìm sân: ${errorMessage}`,
      );
    }
  }

  async update(id: number, updateCourtDto: UpdateCourtDto): Promise<Court> {
    try {
      const court = await this.courtRepository.findOne({
        where: { court_id: id },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      // Kiểm tra code mới nếu được cung cấp
      if (updateCourtDto.code && updateCourtDto.code !== court.code) {
        const existingCourt = await this.courtRepository.findOne({
          where: { code: updateCourtDto.code },
        });

        if (existingCourt) {
          throw new ConflictException(
            `Mã sân '${updateCourtDto.code}' đã tồn tại`,
          );
        }
      }

      // Xử lý xóa ảnh cũ nếu có ảnh mới
      if (updateCourtDto.image && court.image) {
        try {
          if (
            court.image &&
            !court.image.startsWith('http') &&
            fs.existsSync(`.${court.image}`)
          ) {
            fs.unlinkSync(`.${court.image}`);
          }
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh cũ:', error);
        }
      }

      Object.assign(court, updateCourtDto);
      return this.courtRepository.save(court);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể cập nhật sân: ${errorMessage}`,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const court = await this.courtRepository.findOne({
        where: { court_id: id },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      // Xóa file ảnh nếu có
      if (
        court.image &&
        !court.image.startsWith('http') &&
        fs.existsSync(`.${court.image}`)
      ) {
        try {
          fs.unlinkSync(`.${court.image}`);
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh:', error);
        }
      }

      await this.courtRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể xóa sân: ${errorMessage}`,
      );
    }
  }

  async updateStatus(
    id: number,
    status: 'available' | 'booked' | 'maintenance',
  ): Promise<Court> {
    try {
      const court = await this.courtRepository.findOne({
        where: { court_id: id },
      });

      if (!court) {
        throw new NotFoundException(`Không tìm thấy sân với id ${id}`);
      }

      court.status = status;
      return this.courtRepository.save(court);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể cập nhật trạng thái sân: ${errorMessage}`,
      );
    }
  }

  async findByVenue(venueId: number): Promise<CourtResponse[]> {
    try {
      const courts = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.type', 'type')
        .where('court.venue_id = :venueId', { venueId })
        .select([
          'court.*',
          'venue.name AS venue_name',
          'type.name AS type_name',
        ])
        .getRawMany<CourtQueryResult>();

      if (!courts || courts.length === 0) {
        return [];
      }

      return courts.map(
        (court: CourtQueryResult): CourtResponse => ({
          court_id: court.court_id,
          name: court.name,
          code: court.code,
          hourly_rate: court.hourly_rate,
          description: court.description,
          status: court.status,
          image: court.image,
          is_indoor: court.is_indoor,
          created_at: court.created_at,
          updated_at: court.updated_at,
          venue_id: court.venue_id,
          type_id: court.type_id,
          venue_name: court.venue_name,
          type_name: court.type_name,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân theo nhà thi đấu: ${errorMessage}`,
      );
    }
  }

  async findByType(typeId: number): Promise<CourtResponse[]> {
    try {
      const courts = await this.courtRepository
        .createQueryBuilder('court')
        .leftJoinAndSelect('court.venue', 'venue')
        .leftJoinAndSelect('court.type', 'type')
        .where('court.type_id = :typeId', { typeId })
        .select([
          'court.*',
          'venue.name AS venue_name',
          'type.name AS type_name',
        ])
        .getRawMany<CourtQueryResult>();

      if (!courts || courts.length === 0) {
        return [];
      }

      return courts.map(
        (court: CourtQueryResult): CourtResponse => ({
          court_id: court.court_id,
          name: court.name,
          code: court.code,
          hourly_rate: court.hourly_rate,
          description: court.description,
          status: court.status,
          image: court.image,
          is_indoor: court.is_indoor,
          created_at: court.created_at,
          updated_at: court.updated_at,
          venue_id: court.venue_id,
          type_id: court.type_id,
          venue_name: court.venue_name,
          type_name: court.type_name,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách sân theo loại sân: ${errorMessage}`,
      );
    }
  }
}
