import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' }, // ✅ Tăng thời gian token
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule], // ✅ Export JwtModule
})
export class AuthModule {}
