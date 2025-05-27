// import { User } from '../../users/entities/user.entity';
import { User } from 'src/user/entities/user.entity';
import { NewsCategory } from './news-category.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NewsStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('news')
export class News {
  @PrimaryGeneratedColumn({ name: 'news_id' })
  news_id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column('text')
  content: string;

  @Column({ name: 'category_id' })
  category_id: number;

  @ManyToOne(() => NewsCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: NewsCategory;

  @Column({ name: 'author_id' })
  author_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ length: 255, nullable: true })
  thumbnail: string;

  @Column({
    type: 'enum',
    enum: NewsStatus,
    default: NewsStatus.DRAFT,
  })
  status: NewsStatus;

  @Column({ name: 'view_count', default: 0 })
  view_count: number;

  @Column({ name: 'is_featured', type: 'tinyint', default: 0 })
  is_featured: number;

  @Column({ name: 'is_internal', type: 'tinyint', default: 0 })
  is_internal: number;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  published_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
