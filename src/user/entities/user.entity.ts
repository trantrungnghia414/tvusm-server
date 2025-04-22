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

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'customer'],
    default: 'customer',
  })
  role: string;

  @CreateDateColumn()
  created_at: Date;

  // @OneToMany(() => Booking, (booking) => booking.user)
  // bookings: Booking[];

  // @OneToMany(() => News, (news) => news.created_by)
  // news: News[];
}
