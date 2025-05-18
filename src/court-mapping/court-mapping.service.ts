import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourtMapping } from './entities/court-mapping.entity';
import { Court } from '../court/entities/court.entity';
import { CreateCourtMappingDto } from 'src/court-mapping/dto/create-court-mapping.dto';
import { UpdateCourtMappingDto } from 'src/court-mapping/dto/update-court-mapping.dto';

@Injectable()
export class CourtMappingService {
  constructor(
    @InjectRepository(CourtMapping)
    private readonly courtMappingRepository: Repository<CourtMapping>,
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
  ) {}

  async findAll() {
    try {
      // Lấy tất cả court mappings kèm theo thông tin sân cha và sân con
      const mappings = await this.courtMappingRepository
        .createQueryBuilder('mapping')
        .leftJoinAndSelect('mapping.parentCourt', 'parentCourt')
        .leftJoinAndSelect('mapping.childCourt', 'childCourt')
        .select([
          'mapping.mapping_id',
          'mapping.parent_court_id',
          'mapping.child_court_id',
          'mapping.position',
          'mapping.created_at',
          'parentCourt.name',
          'parentCourt.code',
          'childCourt.name',
          'childCourt.code',
        ])
        .getMany();

      // Định dạng lại kết quả để dễ dàng hiển thị
      return mappings.map((mapping) => ({
        mapping_id: mapping.mapping_id,
        parent_court_id: mapping.parent_court_id,
        child_court_id: mapping.child_court_id,
        position: mapping.position,
        created_at: mapping.created_at,
        parent_court_name: mapping.parentCourt?.name,
        parent_court_code: mapping.parentCourt?.code,
        child_court_name: mapping.childCourt?.name,
        child_court_code: mapping.childCourt?.code,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Không thể lấy danh sách ghép sân',
      );
    }
  }

  async findOne(id: number) {
    try {
      const mapping = await this.courtMappingRepository
        .createQueryBuilder('mapping')
        .leftJoinAndSelect('mapping.parentCourt', 'parentCourt')
        .leftJoinAndSelect('mapping.childCourt', 'childCourt')
        .select([
          'mapping.mapping_id',
          'mapping.parent_court_id',
          'mapping.child_court_id',
          'mapping.position',
          'mapping.created_at',
          'parentCourt.name',
          'parentCourt.code',
          'childCourt.name',
          'childCourt.code',
        ])
        .where('mapping.mapping_id = :id', { id })
        .getOne();

      if (!mapping) {
        throw new NotFoundException(`Không tìm thấy ghép sân với ID: ${id}`);
      }

      return {
        mapping_id: mapping.mapping_id,
        parent_court_id: mapping.parent_court_id,
        child_court_id: mapping.child_court_id,
        position: mapping.position,
        created_at: mapping.created_at,
        parent_court_name: mapping.parentCourt?.name,
        parent_court_code: mapping.parentCourt?.code,
        child_court_name: mapping.childCourt?.name,
        child_court_code: mapping.childCourt?.code,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể lấy thông tin ghép sân',
      );
    }
  }

  async create(createCourtMappingDto: CreateCourtMappingDto) {
    try {
      // Kiểm tra xem sân cha có tồn tại không
      const parentCourt = await this.courtRepository.findOne({
        where: { court_id: createCourtMappingDto.parent_court_id },
      });

      if (!parentCourt) {
        throw new BadRequestException(
          `Không tìm thấy sân cha với ID: ${createCourtMappingDto.parent_court_id}`,
        );
      }

      // Kiểm tra xem sân con có tồn tại không
      const childCourt = await this.courtRepository.findOne({
        where: { court_id: createCourtMappingDto.child_court_id },
      });

      if (!childCourt) {
        throw new BadRequestException(
          `Không tìm thấy sân con với ID: ${createCourtMappingDto.child_court_id}`,
        );
      }

      // Kiểm tra xem mối quan hệ này đã tồn tại chưa
      const existingMapping = await this.courtMappingRepository.findOne({
        where: {
          parent_court_id: createCourtMappingDto.parent_court_id,
          child_court_id: createCourtMappingDto.child_court_id,
        },
      });

      if (existingMapping) {
        throw new ConflictException('Mối quan hệ ghép sân này đã tồn tại');
      }

      // Kiểm tra xem sân con đã là sân con của sân khác chưa
      const childInOtherMapping = await this.courtMappingRepository.findOne({
        where: {
          child_court_id: createCourtMappingDto.child_court_id,
        },
      });

      if (childInOtherMapping) {
        throw new ConflictException(
          'Sân con này đã được ghép với một sân cha khác',
        );
      }

      // Tạo mối quan hệ mới
      const newMapping = this.courtMappingRepository.create(
        createCourtMappingDto,
      );
      return this.courtMappingRepository.save(newMapping);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể tạo ghép sân');
    }
  }

  async update(id: number, updateCourtMappingDto: UpdateCourtMappingDto) {
    try {
      // Tìm mapping hiện tại
      const mapping = await this.courtMappingRepository.findOne({
        where: { mapping_id: id },
      });

      if (!mapping) {
        throw new NotFoundException(`Không tìm thấy ghép sân với ID: ${id}`);
      }

      // Nếu cập nhật parent_court_id
      if (updateCourtMappingDto.parent_court_id) {
        const parentCourt = await this.courtRepository.findOne({
          where: { court_id: updateCourtMappingDto.parent_court_id },
        });

        if (!parentCourt) {
          throw new BadRequestException(
            `Không tìm thấy sân cha với ID: ${updateCourtMappingDto.parent_court_id}`,
          );
        }
      }

      // Nếu cập nhật child_court_id
      if (updateCourtMappingDto.child_court_id) {
        const childCourt = await this.courtRepository.findOne({
          where: { court_id: updateCourtMappingDto.child_court_id },
        });

        if (!childCourt) {
          throw new BadRequestException(
            `Không tìm thấy sân con với ID: ${updateCourtMappingDto.child_court_id}`,
          );
        }

        // Kiểm tra xem sân con mới đã là sân con của sân khác chưa
        const childInOtherMapping = await this.courtMappingRepository.findOne({
          where: {
            child_court_id: updateCourtMappingDto.child_court_id,
            mapping_id: { not: id }, // Loại trừ mapping hiện tại
          },
        });

        if (childInOtherMapping) {
          throw new ConflictException(
            'Sân con này đã được ghép với một sân cha khác',
          );
        }
      }

      // Kiểm tra nếu cả parent_court_id và child_court_id được cập nhật
      if (
        updateCourtMappingDto.parent_court_id &&
        updateCourtMappingDto.child_court_id
      ) {
        const existingMapping = await this.courtMappingRepository.findOne({
          where: {
            parent_court_id: updateCourtMappingDto.parent_court_id,
            child_court_id: updateCourtMappingDto.child_court_id,
            mapping_id: { not: id }, // Loại trừ mapping hiện tại
          },
        });

        if (existingMapping) {
          throw new ConflictException('Mối quan hệ ghép sân này đã tồn tại');
        }
      }

      // Cập nhật mapping
      Object.assign(mapping, updateCourtMappingDto);
      return this.courtMappingRepository.save(mapping);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể cập nhật ghép sân');
    }
  }

  async remove(id: number) {
    try {
      const mapping = await this.courtMappingRepository.findOne({
        where: { mapping_id: id },
      });

      if (!mapping) {
        throw new NotFoundException(`Không tìm thấy ghép sân với ID: ${id}`);
      }

      await this.courtMappingRepository.remove(mapping);
      return { message: 'Xóa ghép sân thành công' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể xóa ghép sân');
    }
  }
}
