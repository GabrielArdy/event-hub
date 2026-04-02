import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { SeatsGateway } from '../gateways/seats.gateway';
import { OrderStatusGateway } from '../gateways/order-status.gateway';
import { TicketStatus } from '@prisma/client';

@Injectable()
@Processor('tickets')
export class SeatLockProcessor {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private seatsGateway: SeatsGateway,
    private orderStatusGateway: OrderStatusGateway,
  ) {}

  @Process('release-seat-lock')
  async handleReleaseSeatLock(job: Job<{ orderId: string; seats: string[] }>) {
    const { orderId, seats } = job.data;

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== TicketStatus.PENDING_PAYMENT) {
      // Order already paid or cancelled — nothing to do
      return;
    }

    // Expire the order
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: TicketStatus.EXPIRED },
    });

    // Release seat locks in Redis
    for (const seat of seats) {
      await this.redis.releaseSeat(seat);
    }

    // WS push SEAT_RELEASED
    if (seats.length) {
      this.seatsGateway.pushSeatReleased(order.eventId, seats, 'TIMEOUT');
    }

    // WS push ORDER_STATUS_CHANGED to buyer
    this.orderStatusGateway.pushOrderStatusChanged(orderId, {
      old_status: TicketStatus.PENDING_PAYMENT,
      new_status: TicketStatus.EXPIRED,
      message: 'Batas waktu pembayaran telah habis. Silakan ulangi pemesanan.',
    });
  }
}
