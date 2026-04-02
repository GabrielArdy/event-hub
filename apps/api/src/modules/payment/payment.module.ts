import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentStatusGateway } from './gateways/payment-status.gateway';
import { MidtransGateway } from './gateways/midtrans.gateway';
import { BulkRefundProcessor } from './jobs/bulk-refund.processor';
import { OrganizerModule } from '../organizer/organizer.module';
import { TicketingModule } from '../ticketing/ticketing.module';
import { QueueModule } from '../../common/queue/queue.module';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({ name: 'payments' }),
    OrganizerModule,
    TicketingModule,
    QueueModule,
  ],
  providers: [PaymentService, PaymentStatusGateway, MidtransGateway, BulkRefundProcessor],
  controllers: [PaymentController],
  exports: [PaymentService, MidtransGateway],
})
export class PaymentModule {}
