import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('equipment_categories')
export class EquipmentCategory {
  @PrimaryGeneratedColumn({ name: 'category_id' })
  category_id: number;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
