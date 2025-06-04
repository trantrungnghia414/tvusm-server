import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Court } from '../../court/entities/court.entity';
import { User } from '../../user/entities/user.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  booking_id: number;

  @Column()
  user_id: number;

  @Column()
  court_id: number;

  @Column({ type: 'date' })
  booking_date: string;

  @Column({ type: 'date', nullable: true })
  date: string;

  @Column()
  start_time: string;

  @Column()
  end_time: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column()
  booking_code: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid',
  })
  payment_status: string;

  @Column({
    type: 'enum',
    enum: ['student', 'staff', 'public'],
  })
  booking_type: string;

  @Column({ nullable: true })
  student_id: string;

  @Column({ nullable: true })
  purpose: string;

  @Column({ nullable: true })
  number_of_players: number;

  @Column({ nullable: true })
  notes: string;

  @Column()
  renter_name: string;

  @Column()
  renter_email: string;

  @Column()
  renter_phone: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => Court, (court) => court.bookings)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
