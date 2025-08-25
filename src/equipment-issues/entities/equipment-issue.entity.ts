import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('equipment_issues')
export class EquipmentIssue {
  @PrimaryGeneratedColumn({ name: 'issue_id' })
  issue_id: number;

  @Column({ type: 'int' })
  equipment_id: number;

  @Column({ type: 'int' })
  reported_by: number;

  @Column({
    type: 'enum',
    enum: ['broken', 'malfunction', 'maintenance_needed', 'missing', 'damaged'],
    default: 'broken',
  })
  issue_type:
    | 'broken'
    | 'malfunction'
    | 'maintenance_needed'
    | 'missing'
    | 'damaged';

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location_when_found?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image?: string | null;

  @Column({
    type: 'enum',
    enum: ['reported', 'in_progress', 'resolved', 'cancelled'],
    default: 'reported',
  })
  status: 'reported' | 'in_progress' | 'resolved' | 'cancelled';

  @Column({ type: 'int', nullable: true })
  assigned_to?: number | null;

  @Column({ type: 'text', nullable: true })
  resolution_notes?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_estimate?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actual_cost?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reported_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  updated_at?: Date | null;
}
