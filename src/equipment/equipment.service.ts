import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Equipment, EquipmentStatus } from './entities/equipment.entity';
import { EquipmentCategory } from './entities/equipment-category.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { UpdateEquipmentStatusDto } from './dto/update-equipment-status.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { EquipmentWithExtras } from './interfaces/equipment-with-extras.interface';
import * as fs from 'fs';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
    @InjectRepository(EquipmentCategory)
    private categoryRepository: Repository<EquipmentCategory>,
  ) {}

  // Lấy danh sách thiết bị với thông tin bổ sung
  async findAll(search?: string): Promise<EquipmentWithExtras[]> {
    try {
      console.log('Bắt đầu truy vấn danh sách thiết bị');

      // Kiểm tra xem có thiết bị nào không
      const count = await this.equipmentRepository.count();
      console.log(`Số lượng thiết bị trong CSDL: ${count}`);

      // Nếu không có dữ liệu, trả về mảng rỗng
      if (count === 0) {
        console.log('Không có thiết bị nào trong CSDL, trả về mảng rỗng');
        return [];
      }

      const query = this.equipmentRepository
        .createQueryBuilder('equipment')
        .leftJoinAndSelect('equipment.category', 'category')
        .leftJoinAndSelect('equipment.venue', 'venue')
        .leftJoinAndSelect('equipment.user', 'user');

      if (search) {
        query.where(
          'equipment.name LIKE :search OR equipment.description LIKE :search OR equipment.code LIKE :search',
          { search: `%${search}%` },
        );
      }

      query.orderBy('equipment.created_at', 'DESC');

      const equipments = await query.getMany();
      console.log(`Đã query được ${equipments.length} thiết bị`);

      // Đưa category_name và venue_name vào kết quả trả về
      return equipments.map((item) => {
        const category_name = item.category ? item.category.name : null;
        const venue_name = item.venue ? item.venue.name : null;
        const added_by_name = item.user
          ? item.user.fullname || item.user.username
          : null;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { category, venue, user, ...rest } = item;
        return {
          ...rest,
          category_name,
          venue_name,
          added_by_name,
        } as EquipmentWithExtras;
      });
    } catch (error) {
      console.error('Error fetching equipment list:', error);
      // Trả về mảng rỗng thay vì ném lỗi
      return [];
    }
  }

  // Lấy thông tin chi tiết thiết bị
  async findOne(id: number): Promise<EquipmentWithExtras> {
    try {
      const equipment = await this.equipmentRepository
        .createQueryBuilder('equipment')
        .leftJoin('equipment.category', 'category')
        .leftJoin('equipment.venue', 'venue')
        .leftJoin('equipment.user', 'user')
        .select([
          'equipment',
          'category.name',
          'venue.name',
          'user.fullname',
          'user.username',
        ])
        .where('equipment.equipment_id = :id', { id })
        .getOne();

      if (!equipment) {
        throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
      }

      const category_name = equipment.category ? equipment.category.name : null;
      const venue_name = equipment.venue ? equipment.venue.name : null;
      const added_by_name = equipment.user
        ? equipment.user.fullname || equipment.user.username
        : null;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { category, venue, user, ...rest } = equipment;
      return {
        ...rest,
        category_name,
        venue_name,
        added_by_name,
      } as EquipmentWithExtras;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching equipment details:', error);
      throw new InternalServerErrorException(
        'Không thể tải thông tin thiết bị',
      );
    }
  }

  // Tạo thiết bị mới
  async create(
    createEquipmentDto: CreateEquipmentDto,
    userId: number,
    imagePath?: string,
  ): Promise<Equipment> {
    try {
      // Kiểm tra category có tồn tại không
      const categoryExists = await this.categoryRepository.findOneBy({
        category_id: createEquipmentDto.category_id,
      });
      if (!categoryExists) {
        throw new BadRequestException('Danh mục không tồn tại');
      }

      // Kiểm tra code đã tồn tại chưa
      const codeExists = await this.equipmentRepository.findOneBy({
        code: createEquipmentDto.code,
      });
      if (codeExists) {
        throw new BadRequestException(
          'Mã thiết bị đã tồn tại, vui lòng chọn mã khác',
        );
      }

      // Tạo đối tượng equipment mới
      const equipment = this.equipmentRepository.create({
        ...createEquipmentDto,
        added_by: userId,
        image: imagePath,
      });

      return await this.equipmentRepository.save(equipment);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating equipment:', error);
      throw new InternalServerErrorException('Không thể tạo thiết bị mới');
    }
  }

  // Cập nhật thiết bị
  async update(
    id: number,
    updateEquipmentDto: UpdateEquipmentDto,
    userId: number,
    imagePath?: string,
    isAdmin = false,
  ): Promise<EquipmentWithExtras> {
    try {
      // Kiểm tra thiết bị có tồn tại không
      const equipment = await this.equipmentRepository.findOneBy({
        equipment_id: id,
      });
      if (!equipment) {
        throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
      }

      // Kiểm tra quyền cập nhật (chỉ người tạo hoặc admin mới được cập nhật)
      if (equipment.added_by !== userId && !isAdmin) {
        throw new ForbiddenException(
          'Bạn không có quyền cập nhật thiết bị này',
        );
      }

      // Kiểm tra code nếu có cập nhật
      if (
        updateEquipmentDto.code &&
        updateEquipmentDto.code !== equipment.code
      ) {
        const codeExists = await this.equipmentRepository.findOneBy({
          code: updateEquipmentDto.code,
        });
        if (codeExists) {
          throw new BadRequestException(
            'Mã thiết bị đã tồn tại, vui lòng chọn mã khác',
          );
        }
      }

      // Kiểm tra category nếu có cập nhật
      if (updateEquipmentDto.category_id) {
        const categoryExists = await this.categoryRepository.findOneBy({
          category_id: updateEquipmentDto.category_id,
        });
        if (!categoryExists) {
          throw new BadRequestException('Danh mục không tồn tại');
        }
      }

      // Nếu cập nhật ảnh mới và có ảnh cũ, xóa ảnh cũ
      if (imagePath && equipment.image) {
        try {
          // Chỉ xóa nếu ảnh hiện tại là upload file (không phải đường dẫn URL)
          if (
            !equipment.image.startsWith('http') &&
            fs.existsSync(`.${equipment.image}`)
          ) {
            fs.unlinkSync(`.${equipment.image}`);
          }
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh cũ:', error);
          // Vẫn tiếp tục cập nhật ngay cả khi xóa ảnh thất bại
        }
      }

      // Cập nhật thông tin thiết bị
      await this.equipmentRepository.update(
        { equipment_id: id },
        {
          ...updateEquipmentDto,
          image: imagePath || equipment.image,
        },
      );

      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error updating equipment:', error);
      throw new InternalServerErrorException(
        'Không thể cập nhật thông tin thiết bị',
      );
    }
  }

  // Cập nhật trạng thái thiết bị
  async updateStatus(
    id: number,
    updateStatusDto: UpdateEquipmentStatusDto,
    userId: number,
    isAdmin = false,
  ): Promise<EquipmentWithExtras> {
    try {
      const equipment = await this.equipmentRepository.findOneBy({
        equipment_id: id,
      });

      if (!equipment) {
        throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
      }

      // Kiểm tra quyền cập nhật (chỉ người tạo hoặc admin mới được cập nhật)
      if (equipment.added_by !== userId && !isAdmin) {
        throw new ForbiddenException(
          'Bạn không có quyền cập nhật trạng thái thiết bị này',
        );
      }

      // Cập nhật trạng thái
      await this.equipmentRepository.update(
        { equipment_id: id },
        {
          status: updateStatusDto.status,
        },
      );

      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error updating equipment status:', error);
      throw new InternalServerErrorException(
        'Không thể cập nhật trạng thái thiết bị',
      );
    }
  }

  // Xóa thiết bị
  async remove(
    id: number,
    userId: number,
    isAdmin = false,
  ): Promise<{ message: string }> {
    try {
      const equipment = await this.equipmentRepository.findOneBy({
        equipment_id: id,
      });

      if (!equipment) {
        throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
      }

      // Kiểm tra quyền xóa (chỉ người tạo hoặc admin mới được xóa)
      if (equipment.added_by !== userId && !isAdmin) {
        throw new ForbiddenException('Bạn không có quyền xóa thiết bị này');
      }

      // Xóa ảnh từ filesystem nếu có
      if (equipment.image && !equipment.image.startsWith('http')) {
        try {
          const imagePath = `.${equipment.image}`;
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (error) {
          console.error('Lỗi khi xóa file ảnh:', error);
          // Tiếp tục xóa thiết bị ngay cả khi xóa file ảnh thất bại
        }
      }

      // Thực hiện xóa thiết bị
      await this.equipmentRepository.delete(id);
      return { message: 'Xóa thiết bị thành công' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error removing equipment:', error);
      throw new InternalServerErrorException('Không thể xóa thiết bị');
    }
  }

  // Tìm thiết bị theo danh mục
  async findByCategory(categoryId: number, limit = 10): Promise<Equipment[]> {
    try {
      // Kiểm tra danh mục có tồn tại không
      const categoryExists = await this.categoryRepository.findOneBy({
        category_id: categoryId,
      });
      if (!categoryExists) {
        throw new NotFoundException('Danh mục không tồn tại');
      }

      return this.equipmentRepository.find({
        where: {
          category_id: categoryId,
        },
        order: {
          created_at: 'DESC',
        },
        take: limit,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error finding equipment by category:', error);
      throw new InternalServerErrorException(
        'Không thể tìm thiết bị theo danh mục',
      );
    }
  }

  // Tìm thiết bị theo trạng thái
  async findByStatus(
    status: EquipmentStatus,
    limit = 10,
  ): Promise<Equipment[]> {
    try {
      return this.equipmentRepository.find({
        where: {
          status,
        },
        order: {
          created_at: 'DESC',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Error finding equipment by status:', error);
      throw new InternalServerErrorException(
        'Không thể tìm thiết bị theo trạng thái',
      );
    }
  }

  // Lấy danh sách danh mục thiết bị
  async findAllCategories(): Promise<EquipmentCategory[]> {
    try {
      return this.categoryRepository.find({
        order: {
          name: 'ASC',
        },
      });
    } catch (error) {
      console.error('Error fetching equipment categories:', error);
      throw new InternalServerErrorException(
        'Không thể tải danh sách danh mục',
      );
    }
  }

  // Tạo danh mục thiết bị mới
  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<EquipmentCategory> {
    try {
      // Kiểm tra name đã tồn tại chưa
      const nameExists = await this.categoryRepository.findOneBy({
        name: createCategoryDto.name,
      });

      if (nameExists) {
        throw new BadRequestException('Tên danh mục đã tồn tại');
      }

      const category = this.categoryRepository.create(createCategoryDto);
      return this.categoryRepository.save(category);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating category:', error);
      throw new InternalServerErrorException('Không thể tạo danh mục');
    }
  }

  // Tìm kiếm thiết bị
  async search(query: string, limit = 10): Promise<Equipment[]> {
    try {
      if (!query) {
        return [];
      }

      return this.equipmentRepository.find({
        where: [
          { name: Like(`%${query}%`) },
          { description: Like(`%${query}%`) },
          { code: Like(`%${query}%`) },
        ],
        order: {
          created_at: 'DESC',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Error searching equipment:', error);
      throw new InternalServerErrorException('Không thể tìm kiếm thiết bị');
    }
  }

  // Thêm phương thức để cập nhật danh mục
  async updateCategory(
    id: number,
    updateCategoryDto: CreateCategoryDto,
  ): Promise<EquipmentCategory> {
    const { name, description } = updateCategoryDto;

    // Kiểm tra danh mục tồn tại
    const category = await this.categoryRepository.findOneBy({
      category_id: id,
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với id ${id}`);
    }

    // Kiểm tra xem tên mới có bị trùng không (nếu tên thay đổi)
    if (name && name !== category.name) {
      const existingCategory = await this.categoryRepository.findOneBy({
        name,
      });
      if (existingCategory) {
        throw new BadRequestException('Danh mục với tên này đã tồn tại');
      }
    }

    // Cập nhật thông tin
    category.name = name || category.name;
    if (description !== undefined) {
      category.description = description;
    }

    // Lưu thay đổi
    return this.categoryRepository.save(category);
  }

  // Thêm phương thức để xóa danh mục
  async deleteCategory(id: number): Promise<{ message: string }> {
    // Kiểm tra danh mục tồn tại
    const category = await this.categoryRepository.findOneBy({
      category_id: id,
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với id ${id}`);
    }

    // Kiểm tra danh mục đang được sử dụng bởi thiết bị nào không
    const equipmentCount = await this.equipmentRepository.count({
      where: { category_id: id },
    });

    if (equipmentCount > 0) {
      throw new BadRequestException(
        `Không thể xóa danh mục này vì nó đang được sử dụng bởi ${equipmentCount} thiết bị. Vui lòng thay đổi danh mục cho các thiết bị trước.`,
      );
    }

    // Xóa danh mục
    await this.categoryRepository.delete(id);
    return { message: 'Xóa danh mục thành công' };
  }
}
