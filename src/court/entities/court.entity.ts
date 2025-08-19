import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Venue } from '../../venue/entities/venue.entity';
import { CourtType } from '../../court-type/entities/court-type.entity';

@Entity('courts')
export class Court {
  @PrimaryGeneratedColumn()
  court_id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  hourly_rate: number;

  @Column({
    type: 'enum',
    enum: ['available', 'booked', 'maintenance'],
    default: 'available',
  })
  status: 'available' | 'booked' | 'maintenance';

  @Column({ type: 'boolean', default: true })
  is_indoor: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image?: string;

  // ✅ Thêm trường court_level
  @Column({
    type: 'tinyint',
    nullable: true,
    default: 1,
    comment: 'Cấp độ sân: 1=Nhỏ (5 người), 2=Vừa (7 người), 3=Lớn (11 người)',
  })
  court_level?: number;

  // ✅ Thêm trường sub_court_count cho số lượng sân con
  @Column({
    type: 'tinyint',
    nullable: true,
    default: 1,
    comment: 'Số lượng sân con có thể chia từ sân chính',
  })
  sub_court_count?: number;

  @Column()
  venue_id: number;

  @Column()
  type_id: number;

  @ManyToOne(() => Venue, (venue) => venue.courts)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => CourtType, (courtType) => courtType.courts)
  @JoinColumn({ name: 'type_id' })
  courtType: CourtType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
