import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CourtType } from '../../court-type/entities/court-type.entity';
import { Venue } from '../../venue/entities/venue.entity';

@Entity('courts')
export class Court {
  @PrimaryGeneratedColumn()
  court_id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hourly_rate: number;

  @Column({
    type: 'enum',
    enum: ['available', 'booked', 'maintenance'],
    default: 'available',
  })
  status: 'available' | 'booked' | 'maintenance';

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'boolean', default: true })
  is_indoor: boolean;

  @Column()
  venue_id: number;

  @Column()
  type_id: number;

  @ManyToOne(() => Venue, (venue) => venue.courts)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => CourtType, (type) => type.courts)
  @JoinColumn({ name: 'type_id' })
  type: CourtType;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
