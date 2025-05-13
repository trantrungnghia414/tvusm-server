import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  // OneToMany,
} from 'typeorm';
// import { Court } from '../../court/entities/court.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn()
  venue_id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  location: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({
    type: 'enum',
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'maintenance' | 'inactive';

  @Column({ nullable: true })
  image: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Mối quan hệ 1-n: một nhà thi đấu có nhiều sân
  // @OneToMany(() => Court, (court) => court.venue)
  // courts: Court[];
}
