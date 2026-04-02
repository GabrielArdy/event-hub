import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { TicketStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { QueueService } from '../../../common/queue/queue.service';
import { MidtransGateway } from '../gateways/midtrans.gateway';

@Injectable()
@Processor('payments')
export class BulkRefundProcessor {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private midtrans: MidtransGateway,
  ) {}

  @Process('process-bulk-refund')
  async handleBulkRefund(job: Job<{ eventId: string; reason: string }>) {
    const { eventId, reason } = job.data;

    const tickets = await this.prisma.ticket.findMany({
      where: {
        ticketType: { eventId },
        status: { in: [TicketStatus.ACTIVE, TicketStatus.PENDING_PAYMENT] },
      },
      include: { order: { include: { payment: true } } },
    });

    // Group by payment
    const paymentGroups = new Map<string, typeof tickets>();
    for (const ticket of tickets) {
      const paymentId = ticket.order.payment?.id;
      if (!paymentId) continue;
      if (!paymentGroups.has(paymentId)) paymentGroups.set(paymentId, []);
      paymentGroups.get(paymentId)!.push(ticket);
    }

    for (const [paymentId, group] of paymentGroups) {
      const payment = group[0].order.payment!;
      if (payment.status !== PaymentStatus.PAID) continue;

      try {
        if (payment.gatewayRef) {
          await this.midtrans.processRefund(payment.gatewayRef, payment.amountIdr, payment.orderId);
        }

        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: PaymentStatus.REFUNDED },
          }),
          this.prisma.ticket.updateMany({
            where: { id: { in: group.map((t) => t.id) } },
            data: { status: TicketStatus.REFUNDED },
          }),
        ]);

        await this.queue.add('send-refund-notification', {
          userId: group[0].userId,
          eventId,
          reason,
          amountIdr: payment.amountIdr,
        });
      } catch (err: any) {
        job.log(`Refund failed for payment ${paymentId}: ${err.message}`);
        // Continue processing other payments
      }
    }
  }

  @Process('process-payout')
  async handlePayout(job: Job<{ eventId: string }>) {
    const { eventId } = job.data;

    const acquired = await this.prisma.payout.findUnique({ where: { eventId } });
    if (acquired && acquired.status !== 'PENDING') return;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true, org: true },
    });
    if (!event || event.status !== 'COMPLETED') return;

    const D7 = new Date(event.endAt.getTime() + 7 * 24 * 3600 * 1000);
    if (new Date() < D7) return; // Not yet D+7

    const revenueGross = event.ticketTypes.reduce(
      (sum, tt) => sum + tt.quotaSold * tt.priceIdr,
      0,
    );
    const platformFee = Math.ceil(revenueGross * 0.03);
    const revenueNet = revenueGross - platformFee;

    await this.prisma.payout.upsert({
      where: { eventId },
      create: {
        eventId,
        status: 'ELIGIBLE',
        eligibleAt: D7,
        revenueGrossIdr: revenueGross,
        platformFeeIdr: platformFee,
        gatewayFeeIdr: 0,
        refundTotalIdr: 0,
        revenueNetIdr: revenueNet,
        payoutAmountIdr: revenueNet,
      },
      update: { status: 'ELIGIBLE' },
    });
  }
}
