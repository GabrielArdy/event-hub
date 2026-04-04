import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TicketingService } from './ticketing.service';
import { TicketingController } from './ticketing.controller';
import { SeatsGateway } from './gateways/seats.gateway';
import { OrderStatusGateway } from './gateways/order-status.gateway';
import { SeatLockProcessor } from './jobs/seat-lock.processor';
import { OrganizerModule } from '../organizer/organizer.module';
import { QueueModule } from '../../common/queue/queue.module';

@Module({
  imports: [JwtModule.register({}), OrganizerModule, QueueModule],
  providers: [TicketingService, SeatsGateway, OrderStatusGateway, SeatLockProcessor],
  controllers: [TicketingController],
  exports: [TicketingService, SeatsGateway, OrderStatusGateway],
})
export class TicketingModule {}
