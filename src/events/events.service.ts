import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
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
      const savedEvent = await this.eventRepository.save(event);

      // ✅ Thông báo cho tất cả users về sự kiện mới (nếu is_public)
      if (savedEvent.is_public) {
        const users = await this.userRepository.find({
          where: { status: 'active' },
          select: ['user_id'],
        });

        const userIds = users.map((user) => user.user_id);

        if (userIds.length > 0) {
          await this.notificationService.createEventNotification(
            userIds,
            savedEvent.event_id,
            'created',
            savedEvent.title,
          );

          console.log(
            `🎉 Sent event creation notification to ${userIds.length} users`,
          );
        }
      }

      return savedEvent;
    } catch (error) {
      console.error('❌ Error creating event:', error);
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

    // Lưu event trước khi gửi notification
    const savedEvent = await this.eventRepository.save(event);

    // ✅ Sửa lỗi: Thông báo cho participants về update với title safety check
    const participants = await this.participantRepository.find({
      where: { event_id: id },
      select: ['user_id'],
    });

    const userIds = participants.map((p) => p.user_id);

    if (userIds.length > 0) {
      // ✅ Sử dụng title từ saved event thay vì updatedEventData
      const eventTitle =
        updatedEventData.title || savedEvent.title || 'Sự kiện';

      await this.notificationService.createEventNotification(
        userIds,
        id,
        'updated',
        eventTitle,
      );

      console.log(
        `📝 Sent event update notification to ${userIds.length} participants`,
      );
    }

    return savedEvent;
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

    // ✅ Thông báo cho participants về hủy sự kiện
    const participants = await this.participantRepository.find({
      where: { event_id: id },
      select: ['user_id'],
    });

    const userIds = participants.map((p) => p.user_id);

    if (userIds.length > 0) {
      await this.notificationService.createEventNotification(
        userIds,
        id,
        'cancelled',
        event.title,
      );

      console.log(
        `❌ Sent event cancellation notification to ${userIds.length} participants`,
      );
    }

    await this.eventRepository.remove(event);
  }

  async updateStatus(id: number, status: EventStatus): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { event_id: id },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${id}`);
    }

    const oldStatus = event.status;
    event.status = status;
    const updatedEvent = await this.eventRepository.save(event);

    // ✅ Thông báo cho participants về thay đổi trạng thái
    if (
      status === EventStatus.CANCELLED &&
      oldStatus !== EventStatus.CANCELLED
    ) {
      const participants = await this.participantRepository.find({
        where: { event_id: id },
        select: ['user_id'],
      });

      const userIds = participants.map((p) => p.user_id);

      if (userIds.length > 0) {
        await this.notificationService.createEventNotification(
          userIds,
          id,
          'cancelled',
          event.title,
        );

        console.log(
          `❌ Sent event status change notification to ${userIds.length} participants`,
        );
      }
    }

    return updatedEvent;
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
          status: EventStatus.UPCOMING,
          start_date: LessThanOrEqual(today),
        },
        { status: EventStatus.ONGOING },
      );

      // Cập nhật sự kiện "ongoing" thành "completed" khi ngày kết thúc < ngày hiện tại
      await this.eventRepository.update(
        {
          status: EventStatus.ONGOING,
          end_date: LessThanOrEqual(today),
        },
        { status: EventStatus.COMPLETED },
      );

      this.logger.log('Cập nhật trạng thái sự kiện thành công');
    } catch (error) {
      this.logger.error('Lỗi khi cập nhật trạng thái sự kiện:', error);
    }
  }
}
