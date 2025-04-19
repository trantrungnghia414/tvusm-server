import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'src/models/user.model';

@Injectable()
export class UsersService {
  private users: User[] = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      email: 'a@gmail.com',
      password: '123456',
    },
    {
      id: 2,
      name: 'Nguyễn Văn B',
      email: 'b@gmail.com',
      password: '123456',
    },
    {
      id: 3,
      name: 'Nguyễn Văn C',
      email: 'c@gmail.com',
      password: '123456',
    },
  ];

  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: number): User {
    const user = this.users.find((item) => item.id === Number(id));
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  createUser(): string {
    return 'This is a user created';
  }

  updateUser(): string {
    return 'This is a user updated';
  }

  deleteUser(): string {
    return 'This is a user deleted';
  }
}
