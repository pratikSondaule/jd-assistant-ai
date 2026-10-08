import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { JwtRefreshStrategy } from 'src/strategies/jwtRefresh.strategy';
import { GoogleStrategy } from 'src/strategies/google.strategy';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy
  ]
})
export class AuthModule { }
