import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity'; // Đảm bảo import EventStatus
import { EventParticipant } from './entities/event-participant.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantStatusDto } from './dto/update-participant-status.dto';
import { EventWithExtras } from './interfaces/event-with-extras.interface';
import * as fs from 'fs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventParticipant)
    private participantRepository: Repository<EventParticipant>,
  ) {}

  async create(createEventDto: CreateEventDto, userId: number): Promise<Event> {
    try {
      // Kiểm tra và đảm bảo userId là số
      if (!userId || isNaN(Number(userId))) {
        throw new BadRequestException('Invalid organizer_id');
      }

      const organizerId = Number(userId);

      // Kiểm tra ngày bắt đầu và kết thúc
      if (
        createEventDto.end_date &&
        new Date(createEventDto.end_date) < new Date(createEventDto.start_date)
      ) {
        throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
      }

      // Chuyển đổi các trường ngày tháng
      const startDate = new Date(createEventDto.start_date);
      const endDate = createEventDto.end_date
        ? new Date(createEventDto.end_date)
        : undefined;

      // Đặt giá trị mặc định cho is_public và is_featured
      const eventData = {
        ...createEventDto,
        organizer_id: organizerId,
        // Giữ nguyên giá trị từ DTO
        is_public: createEventDto.is_public ?? 1,
        is_featured: createEventDto.is_featured ?? 1,
        start_date: startDate,
        end_date: endDate,
        status: createEventDto.status || EventStatus.UPCOMING,
      };

      // Tạo và lưu event
      const event = this.eventRepository.create(eventData);
      return await this.eventRepository.save(event);
    } catch (error) {
      console.error('Error in create event service:', error);
      throw error;
    }
  }

  async findAll(venueId?: number, statusList?: string[]): Promise<Event[]> {
    try {
      const queryBuilder = this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.venue', 'venue')
        .leftJoinAndSelect('event.court', 'court')
        .select(['event', 'venue.venue_id', 'venue.name']);

      // Nếu có venueId, thêm điều kiện lọc theo nhà thi đấu
      if (venueId) {
        queryBuilder.andWhere('event.venue_id = :venueId', { venueId });
      }

      // Nếu có danh sách trạng thái, lọc theo các trạng thái đó
      if (statusList && statusList.length > 0) {
        queryBuilder.andWhere('event.status IN (:...statusList)', {
          statusList,
        });
      }

      const events = await queryBuilder.getMany();

      // Sắp xếp theo ngày bắt đầu, mới nhất trước
      queryBuilder.orderBy('event.start_date', 'DESC');

      // return await queryBuilder.getMany();
      return events.map((event) => ({
        ...event,
        venue_name: event.venue?.name || null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in findAll: ${message}`, error);
      throw error;
    }
  }

  async findOne(id: number): Promise<EventWithExtras> {
    const event = await this.eventRepository.findOne({
      where: { event_id: id },
      relations: ['venue', 'court', 'organizer'],
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${id}`);
    }

    // Chuẩn hóa dữ liệu trả về giống với findAll()
    return {
      ...event,
      venue_name: event.venue?.name || null,
      court_name: event.court?.name || null,
      organizer_name:
        event.organizer_name ||
        event.organizer?.fullname ||
        event.organizer?.username ||
        null,
    };
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { event_id: id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Tạo object mới để lưu các thay đổi
    const updatedEventData = { ...updateEventDto };

    // Chuyển đổi ngày tháng sang định dạng ISO string
    if (updateEventDto.start_date) {
      const startDate = new Date(updateEventDto.start_date);
      updatedEventData.start_date = startDate.toISOString().split('T')[0];
    }

    if (updateEventDto.end_date) {
      const endDate = new Date(updateEventDto.end_date);
      updatedEventData.end_date = endDate.toISOString().split('T')[0];
    }

    // Cập nhật các trường khác
    Object.assign(event, updatedEventData);

    return await this.eventRepository.save(event);
  }

  async remove(id: number): Promise<void> {
    // Chỉ cần gọi findOne để kiểm tra sự tồn tại
    await this.findOne(id);

    const event = await this.eventRepository.findOne({
      where: { event_id: id },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${id}`);
    }

    // Xóa file ảnh nếu có
    if (event.image && !event.image.startsWith('http')) {
      try {
        const imagePath = `.${event.image}`;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Đã xóa ảnh của sự kiện: ${imagePath}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa file ảnh:', error);
        // Tiếp tục xóa sự kiện ngay cả khi xóa ảnh thất bại
      }
    }

    await this.eventRepository.remove(event);
  }

  async updateStatus(id: number, status: EventStatus): Promise<Event> {
    // Chỉ cần gọi findOne để kiểm tra sự tồn tại
    await this.findOne(id);

    const event = await this.eventRepository.findOne({
      where: { event_id: id },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${id}`);
    }

    event.status = status;
    return this.eventRepository.save(event);
  }

  // Quản lý người tham gia
  async findParticipants(eventId: number): Promise<EventParticipant[]> {
    await this.findOne(eventId); // Kiểm tra sự kiện có tồn tại không
    return this.participantRepository.find({
      where: { event_id: eventId },
      relations: ['user'],
    });
  }

  async addParticipant(
    eventId: number,
    createParticipantDto: CreateParticipantDto,
  ): Promise<EventParticipant> {
    // Chỉ cần gọi findOne để kiểm tra sự tồn tại
    await this.findOne(eventId);

    const event = await this.eventRepository.findOne({
      where: { event_id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${eventId}`);
    }

    // Kiểm tra số lượng người tham gia
    if (
      event.max_participants &&
      event.current_participants >= event.max_participants
    ) {
      throw new BadRequestException(
        'Sự kiện đã đạt số lượng người tham gia tối đa',
      );
    }

    // Kiểm tra xem người dùng đã đăng ký chưa
    const existingParticipant = await this.participantRepository.findOne({
      where: { event_id: eventId, user_id: createParticipantDto.user_id },
    });

    if (existingParticipant) {
      throw new BadRequestException(
        'Người dùng đã đăng ký tham gia sự kiện này',
      );
    }

    // Tạo người tham gia mới
    const participant = this.participantRepository.create({
      event_id: eventId,
      ...createParticipantDto,
    });

    const savedParticipant = await this.participantRepository.save(participant);

    // Cập nhật số lượng người tham gia
    event.current_participants += 1;
    await this.eventRepository.save(event);

    return savedParticipant;
  }

  async updateParticipantStatus(
    eventId: number,
    participantId: number,
    updateDto: UpdateParticipantStatusDto,
  ): Promise<EventParticipant> {
    await this.findOne(eventId); // Kiểm tra sự tồn tại sự kiện

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, event_id: eventId },
    });

    if (!participant) {
      throw new NotFoundException(
        `Không tìm thấy người tham gia với id ${participantId}`,
      );
    }

    participant.status = updateDto.status;
    return this.participantRepository.save(participant);
  }

  async removeParticipant(
    eventId: number,
    participantId: number,
  ): Promise<void> {
    // Chỉ cần gọi findOne để kiểm tra sự tồn tại
    await this.findOne(eventId);

    const event = await this.eventRepository.findOne({
      where: { event_id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${eventId}`);
    }

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, event_id: eventId },
    });

    if (!participant) {
      throw new NotFoundException(
        `Không tìm thấy người tham gia với id ${participantId}`,
      );
    }

    await this.participantRepository.remove(participant);

    // Cập nhật số lượng người tham gia
    event.current_participants = Math.max(0, event.current_participants - 1);
    await this.eventRepository.save(event);
  }

  // Chạy mỗi ngày lúc 00:01 sáng
  @Cron('1 0 * * *')
  async updateEventStatuses() {
    this.logger.log('Đang cập nhật trạng thái sự kiện...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Cập nhật sự kiện "upcoming" thành "ongoing" khi ngày bắt đầu <= ngày hiện tại
      await this.eventRepository.update(
        {
          status: EventStatus.UPCOMING, // Sử dụng enum
          start_date: LessThanOrEqual(today),
        },
        { status: EventStatus.ONGOING }, // Sử dụng enum
      );

      // Cập nhật sự kiện "ongoing" thành "completed" khi ngày kết thúc < ngày hiện tại
      await this.eventRepository.update(
        {
          status: EventStatus.ONGOING, // Sử dụng enum
          end_date: LessThanOrEqual(today),
        },
        { status: EventStatus.COMPLETED }, // Sử dụng enum
      );

      this.logger.log('Cập nhật trạng thái sự kiện thành công');
    } catch (error) {
      this.logger.error('Lỗi khi cập nhật trạng thái sự kiện:', error);
    }
  }
}
