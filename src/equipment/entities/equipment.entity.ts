import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EquipmentCategory } from './equipment-category.entity';
import { Venue } from '../../venue/entities/venue.entity';
import { User } from '../../user/entities/user.entity';

export enum EquipmentStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  UNAVAILABLE = 'unavailable',
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn({ name: 'equipment_id' })
  equipment_id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  category_id: number;

  @Column({ default: 1 })
  quantity: number;

  @Column({ default: 1 })
  available_quantity: number;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.AVAILABLE,
  })
  status: EquipmentStatus;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'date' })
  purchase_date: Date;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  purchase_price: number;

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 2 })
  rental_fee: number;

  @Column({ nullable: true })
  venue_id: number;

  @Column({ nullable: true })
  image: string;

  @Column({ name: 'added_by', nullable: true })
  added_by: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => EquipmentCategory)
  @JoinColumn({ name: 'category_id' })
  category: EquipmentCategory;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'added_by' })
  user: User;
}
