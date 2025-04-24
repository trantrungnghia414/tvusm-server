import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  generateToken(user: User): string {
    const payload = {
      username: user.username,
      user_id: user.user_id,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
