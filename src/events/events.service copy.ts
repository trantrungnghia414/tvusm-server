import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantStatusDto } from './dto/update-participant-status.dto';
import { EventWithExtras } from './interfaces/event-with-extras.interface';
import * as fs from 'fs';

@Injectable()
export class EventsService {
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

      // Ép kiểu thành số
      const organizerId = Number(userId);

      // Kiểm tra ngày bắt đầu và kết thúc
      if (
        createEventDto.end_date &&
        new Date(createEventDto.end_date) < new Date(createEventDto.start_date)
      ) {
        throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
      }

      // Xử lý các trường Boolean
      if (typeof createEventDto.is_public === 'string') {
        createEventDto.is_public = createEventDto.is_public === 'true';
      }

      if (typeof createEventDto.is_featured === 'string') {
        createEventDto.is_featured = createEventDto.is_featured === 'true';
      }

      // Xử lý cẩn thận các trường số
      if (
        createEventDto.venue_id &&
        typeof createEventDto.venue_id === 'string'
      ) {
        createEventDto.venue_id = parseInt(createEventDto.venue_id);
      }

      if (
        createEventDto.court_id &&
        typeof createEventDto.court_id === 'string'
      ) {
        createEventDto.court_id = parseInt(createEventDto.court_id);
      }

      if (
        createEventDto.max_participants &&
        typeof createEventDto.max_participants === 'string'
      ) {
        createEventDto.max_participants = parseInt(
          createEventDto.max_participants,
        );
      }

      // Tạo sự kiện mới với organizer_id là user hiện tại
      const event = this.eventRepository.create({
        ...createEventDto,
        organizer_id: organizerId,
        // organizer_name đã được bao gồm trong createEventDto
      });

      return this.eventRepository.save(event);
    } catch (error) {
      console.error('Error in create event service:', error);
      throw error;
    }
  }

  async findAll(): Promise<EventWithExtras[]> {
    try {
      const events = await this.eventRepository.find({
        order: { start_date: 'DESC' },
        relations: ['venue', 'court', 'organizer'],
      });

      // Chuyển đổi dữ liệu để thêm các trường venue_name, court_name, organizer_name (nếu chưa có)
      return events.map((event) => {
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
      });
    } catch (error) {
      console.error('Error in findAll events:', error);
      throw new Error('Failed to fetch events');
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
    // Chỉ cần gọi findOne để kiểm tra sự tồn tại và lấy dữ liệu cơ bản
    await this.findOne(id);

    // Lấy event cơ bản từ repository để update
    const event = await this.eventRepository.findOne({
      where: { event_id: id },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${id}`);
    }

    // Xử lý xóa ảnh cũ nếu có ảnh mới
    if (
      updateEventDto.image &&
      event.image &&
      updateEventDto.image !== event.image
    ) {
      try {
        // Chỉ xóa khi ảnh hiện tại là file đã upload (không phải URL bên ngoài)
        if (
          !event.image.startsWith('http') &&
          fs.existsSync(`.${event.image}`)
        ) {
          fs.unlinkSync(`.${event.image}`);
          console.log(`Đã xóa ảnh cũ: ${event.image}`);
        }
      } catch (error) {
        console.error('Lỗi khi xóa file ảnh cũ:', error);
        // Tiếp tục cập nhật dù có lỗi khi xóa file
      }
    }

    // Kiểm tra ngày bắt đầu và kết thúc
    if (
      updateEventDto.end_date &&
      new Date(updateEventDto.end_date) <
        new Date(updateEventDto.start_date || event.start_date)
    ) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // Kiểm tra thời gian bắt đầu và kết thúc
    if (updateEventDto.start_time && updateEventDto.end_time) {
      const startTime = new Date(`2000-01-01T${updateEventDto.start_time}`);
      const endTime = new Date(`2000-01-01T${updateEventDto.end_time}`);

      if (endTime <= startTime) {
        throw new BadRequestException(
          'Thời gian kết thúc phải sau thời gian bắt đầu',
        );
      }
    }

    // Cập nhật sự kiện
    const updatedEvent = this.eventRepository.merge(event, updateEventDto);
    return this.eventRepository.save(updatedEvent);
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
    await this.findOne(eventId); // Kiểm tra sự kiện có tồn tại không

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
}
