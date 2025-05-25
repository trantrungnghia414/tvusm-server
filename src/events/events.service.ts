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

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventParticipant)
    private participantRepository: Repository<EventParticipant>,
  ) {}

  async create(createEventDto: CreateEventDto, userId: number): Promise<Event> {
    // Kiểm tra ngày bắt đầu và kết thúc
    if (
      createEventDto.end_date &&
      new Date(createEventDto.end_date) < new Date(createEventDto.start_date)
    ) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // Kiểm tra thời gian bắt đầu và kết thúc
    if (createEventDto.start_time && createEventDto.end_time) {
      const startTime = new Date(`2000-01-01T${createEventDto.start_time}`);
      const endTime = new Date(`2000-01-01T${createEventDto.end_time}`);

      if (endTime <= startTime) {
        throw new BadRequestException(
          'Thời gian kết thúc phải sau thời gian bắt đầu',
        );
      }
    }

    // Tạo sự kiện mới với người tổ chức là user hiện tại
    const event = this.eventRepository.create({
      ...createEventDto,
      organizer_id: userId,
    });

    return this.eventRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    try {
      return this.eventRepository.find({
        order: { start_date: 'DESC' },
        relations: ['venue'],
      });
    } catch (error) {
      console.error('Error in findAll events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { event_id: id },
      relations: ['venue', 'court', 'organizer'],
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với id ${id}`);
    }

    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

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
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
  }

  async updateStatus(id: number, status: EventStatus): Promise<Event> {
    const event = await this.findOne(id);
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
    const event = await this.findOne(eventId);

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
    const event = await this.findOne(eventId);
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
