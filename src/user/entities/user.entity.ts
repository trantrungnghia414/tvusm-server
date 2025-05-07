import {
  Column,
  CreateDateColumn,
  Entity,
  // OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users') //→ trỏ đúng tới tên bảng trong MySQL
export class User {
  @PrimaryGeneratedColumn() //→ khoá chính tự tăng
  user_id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  fullname: string;

  @Column({ unique: true })
  email: string;

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

  @CreateDateColumn()
  created_at: Date;

  // Thêm các trường mới
  @Column({ nullable: true, name: 'google_id' })
  google_id: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  name: string;

  // @OneToMany(() => Booking, (booking) => booking.user)
  // bookings: Booking[];

  // @OneToMany(() => News, (news) => news.created_by)
  // news: News[];
}
