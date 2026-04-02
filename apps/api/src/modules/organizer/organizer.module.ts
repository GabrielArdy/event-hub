import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrganizerService } from './organizer.service';
import { OrganizerController } from './organizer.controller';
import { OrganizerGateway } from './organizer.gateway';
import { QueueModule } from '../../common/queue/queue.module';

@Module({
  imports: [JwtModule.register({}), QueueModule],
  providers: [OrganizerService, OrganizerGateway],
  controllers: [OrganizerController],
  exports: [OrganizerService, OrganizerGateway],
})
export class OrganizerModule {}
