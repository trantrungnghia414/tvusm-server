import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourtType } from './entities/court-type.entity';
import { CreateCourtTypeDto } from './dto/create-court-type.dto';
import { UpdateCourtTypeDto } from './dto/update-court-type.dto';

@Injectable()
export class CourtTypeService {
  constructor(
    @InjectRepository(CourtType)
    private courtTypeRepository: Repository<CourtType>,
  ) {}

  async create(createCourtTypeDto: CreateCourtTypeDto): Promise<CourtType> {
    try {
      // Kiểm tra tên đã tồn tại chưa
      const existingCourtType = await this.courtTypeRepository.findOne({
        where: { name: createCourtTypeDto.name },
      });

      if (existingCourtType) {
        throw new ConflictException(
          `Loại sân '${createCourtTypeDto.name}' đã tồn tại`,
        );
      }

      const newCourtType = this.courtTypeRepository.create(createCourtTypeDto);
      return this.courtTypeRepository.save(newCourtType);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể tạo loại sân: ${errorMessage}`,
      );
    }
  }

  async findAll(): Promise<CourtType[]> {
    try {
      return this.courtTypeRepository.find({
        order: {
          name: 'ASC',
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể lấy danh sách loại sân: ${errorMessage}`,
      );
    }
  }

  async findOne(id: number): Promise<CourtType> {
    try {
      const courtType = await this.courtTypeRepository.findOne({
        where: { type_id: id },
      });

      if (!courtType) {
        throw new NotFoundException(`Không tìm thấy loại sân với id ${id}`);
      }

      return courtType;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể tìm loại sân: ${errorMessage}`,
      );
    }
  }

  async update(
    id: number,
    updateCourtTypeDto: UpdateCourtTypeDto,
  ): Promise<CourtType> {
    try {
      const courtType = await this.findOne(id);

      // Kiểm tra nếu đổi tên thì tên mới không được trùng với tên đã có
      if (
        updateCourtTypeDto.name &&
        updateCourtTypeDto.name !== courtType.name
      ) {
        const existingCourtType = await this.courtTypeRepository.findOne({
          where: { name: updateCourtTypeDto.name },
        });

        if (existingCourtType) {
          throw new ConflictException(
            `Loại sân '${updateCourtTypeDto.name}' đã tồn tại`,
          );
        }
      }

      Object.assign(courtType, updateCourtTypeDto);
      return this.courtTypeRepository.save(courtType);
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
        `Không thể cập nhật loại sân: ${errorMessage}`,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const courtType = await this.findOne(id);
      await this.courtTypeRepository.remove(courtType);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể xóa loại sân: ${errorMessage}`,
      );
    }
  }

  async isInUse(id: number): Promise<boolean> {
    try {
      const courtType = await this.courtTypeRepository.findOne({
        where: { type_id: id },
        relations: ['courts'],
      });

      if (!courtType) {
        throw new NotFoundException(`Không tìm thấy loại sân với id ${id}`);
      }

      return Array.isArray(courtType.courts) && courtType.courts.length > 0;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể kiểm tra sử dụng loại sân: ${errorMessage}`,
      );
    }
  }
}
