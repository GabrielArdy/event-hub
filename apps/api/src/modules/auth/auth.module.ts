import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { QueueModule } from '../../common/queue/queue.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), QueueModule],
  providers: [AuthService, JwtStrategy, RefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
