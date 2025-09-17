import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Venue } from '../../venue/entities/venue.entity';
import { Court } from '../../court/entities/court.entity';
import { Equipment } from '../../equipment/entities/equipment.entity';

export enum MaintenanceType {
  ROUTINE = 'routine',
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  EMERGENCY = 'emergency',
  INSPECTION = 'inspection',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn()
  maintenance_id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MaintenanceType,
    default: MaintenanceType.ROUTINE,
  })
  type: MaintenanceType;

  @Column({
    type: 'enum',
    enum: MaintenancePriority,
    default: MaintenancePriority.MEDIUM,
  })
  priority: MaintenancePriority;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ nullable: true })
  venue_id: number;

  @Column({ nullable: true })
  court_id: number;

  @Column({ nullable: true })
  equipment_id: number;

  @Column({ nullable: true })
  assigned_to: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actual_cost: number;

  @Column({ type: 'int', nullable: true })
  estimated_duration: number; // in hours

  @Column({ type: 'int', nullable: true })
  actual_duration: number; // in hours

  @Column({ type: 'datetime' })
  scheduled_date: Date;

  @Column({ type: 'datetime', nullable: true })
  started_date: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column()
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Venue, { nullable: true })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Court, { nullable: true })
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assigned_user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
