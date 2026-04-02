import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'payments' },
      { name: 'tickets' },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
