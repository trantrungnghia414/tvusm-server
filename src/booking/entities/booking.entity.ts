import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Court } from '../../court/entities/court.entity';
import { User } from '../../user/entities/user.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  booking_id: number;

  @Column()
  court_id: number;

  // ✅ Đảm bảo user_id có thể null
  @Column({ type: 'int', nullable: true, default: null })
  user_id: number | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'date', nullable: true })
  booking_date: string | null;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  payment_status: PaymentStatus;

  @Column({ type: 'varchar', length: 255 })
  renter_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  renter_email: string | null;

  @Column({ type: 'varchar', length: 20 })
  renter_phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  booking_code: string;

  @Column({
    type: 'enum',
    enum: ['public', 'private', 'event'],
    default: 'public',
  })
  booking_type: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Court, (court) => court.court_id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'court_id' })
  court: Court;

  // ✅ Relation với User - nullable
  @ManyToOne(() => User, (user) => user.bookings, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
