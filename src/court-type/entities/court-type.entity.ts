import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Court } from '../../court/entities/court.entity';

@Entity('court_types')
export class CourtType {
  @PrimaryGeneratedColumn()
  type_id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  standard_size: string;

  @Column({ nullable: true })
  image: string;

  @OneToMany(() => Court, (court) => court.type)
  courts: Court[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
