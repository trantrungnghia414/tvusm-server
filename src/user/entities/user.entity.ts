import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users') //→ trỏ đúng tới tên bảng trong MySQL
export class User {
  @PrimaryGeneratedColumn() //→ khoá chính tự tăng
  user_id: number;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  fullname: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'customer'],
    default: 'customer',
  })
  role: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verification_token: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reset_password_token: string | null;

  @Column({ type: 'datetime', nullable: true })
  reset_password_expires: Date | null;

  @Column({ type: 'datetime', nullable: true })
  verification_expires: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @Column({ nullable: true })
  google_id: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'banned'],
    default: 'active',
    nullable: true,
  })
  status: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
