import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizerModule } from './modules/organizer/organizer.module';
import { TicketingModule } from './modules/ticketing/ticketing.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: process.env.REDIS_URL,
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    OrganizerModule,
    TicketingModule,
    PaymentModule,
  ],
})
export class AppModule {}
