import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Venue } from '../../venue/entities/venue.entity';
import { Court } from '../../court/entities/court.entity';
import { EventParticipant } from './event-participant.entity';

export enum EventStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EventType {
  COMPETITION = 'competition',
  TRAINING = 'training',
  FRIENDLY = 'friendly',
  SCHOOL_EVENT = 'school_event',
  OTHER = 'other',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  event_id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'time', nullable: true })
  start_time: string;

  @Column({ type: 'time', nullable: true })
  end_time: string;

  @Column()
  venue_id: number;

  @ManyToOne(() => Venue, { eager: true })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @Column({ nullable: true })
  court_id: number;

  @ManyToOne(() => Court, { eager: true, nullable: true })
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @Column()
  organizer_id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @Column({ nullable: true })
  max_participants: number;

  @Column({ default: 0 })
  current_participants: number;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  event_type: EventType;

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  is_public: boolean;

  @Column({ default: true })
  is_featured: boolean;

  @Column({ type: 'date', nullable: true })
  registration_deadline: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Loại bỏ thuộc tính generated: true trên các cột này
  // Thay vì dùng generated, ta có thể tính toán giá trị này từ application
  @Column({ type: 'int', nullable: true })
  duration_days: number;

  @Column({ type: 'tinyint', nullable: true })
  event_day_of_week: number;

  @OneToMany(() => EventParticipant, (participant) => participant.event)
  participants: EventParticipant[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizer_name: string;
}
