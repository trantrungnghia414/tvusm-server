// server/src/notification/entities/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
  BOOKING = 'booking',
  PAYMENT = 'payment',
  EVENT = 'event',
  SYSTEM = 'system',
  MAINTENANCE = 'maintenance',
}

@Entity('notifications')
@Index(['user_id', 'is_read'])
@Index(['type'])
@Index(['created_at'])
export class Notification {
  @PrimaryGeneratedColumn()
  notification_id: number;

  @Column()
  user_id: number;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ nullable: true })
  reference_id: number;

  @Column('json', { nullable: true })
  data: any;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.user_id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
