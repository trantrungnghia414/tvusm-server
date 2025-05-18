import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Court } from '../../court/entities/court.entity';

@Entity('court_mappings')
@Unique(['parent_court_id', 'child_court_id'])
export class CourtMapping {
  @PrimaryGeneratedColumn()
  mapping_id: number;

  @Column()
  parent_court_id: number;

  @Column()
  child_court_id: number;

  @Column({ nullable: true })
  position: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Court, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_court_id' })
  parentCourt: Court;

  @ManyToOne(() => Court, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_court_id' })
  childCourt: Court;
}
