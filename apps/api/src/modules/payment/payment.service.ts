import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, RefundPolicy, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { QueueService } from '../../common/queue/queue.service';
import { SeatsGateway } from '../ticketing/gateways/seats.gateway';
import { OrganizerGateway } from '../organizer/organizer.gateway';
import { PaymentStatusGateway } from './gateways/payment-status.gateway';
import { MidtransGateway } from './gateways/midtrans.gateway';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import {
  calculateGatewayFee,
  calculatePlatformFee,
  calculatePaymentTimeout,
} from '../../common/utils/fee-calculator.util';
import { generateQrToken } from '../../common/utils/qr-token.util';
import { addDays } from '@eventhub/shared-utils';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private queue: QueueService,
    private seatsGateway: SeatsGateway,
    private organizerGateway: OrganizerGateway,
    private paymentStatusGateway: PaymentStatusGateway,
    private midtrans: MidtransGateway,
  ) {}

  // ── Initiate Payment (BR-PAY-001) ─────────────────────────────────────────
  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.order_id },
      include: { user: true, event: { include: { paymentConfig: true } }, payment: true },
    });

    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (order.userId !== userId) throw new ForbiddenException('FORBIDDEN');
    if (order.status !== TicketStatus.PENDING_PAYMENT) {
      throw new ConflictException('ORDER_NOT_PENDING');
    }
    if (order.payment) throw new ConflictException('PAYMENT_EXISTS');

    // Validate payment method allowed for this event
    const allowedMethods = order.event.paymentConfig?.paymentMethods ?? [];
    if (allowedMethods.length > 0 && !allowedMethods.includes(dto.payment_method)) {
      throw new UnprocessableEntityException('INVALID_METHOD');
    }

    const timeoutMinutes = calculatePaymentTimeout(dto.payment_method);
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    const feeBearer = order.event.paymentConfig?.feeBearer ?? 'BUYER';
    const gatewayFeeIdr =
      feeBearer === 'BUYER' ? calculateGatewayFee(dto.payment_method, order.totalIdr) : 0;
    const totalIdr = order.totalIdr + gatewayFeeIdr;

    let paymentData: any = {
      orderId: order.id,
      method: dto.payment_method,
      status: PaymentStatus.WAITING_PAYMENT,
      amountIdr: totalIdr,
      expiresAt,
    };

    let responseData: any = {
      payment_id: '',
      order_id: order.id,
      method: dto.payment_method,
      status: PaymentStatus.WAITING_PAYMENT,
      amount_idr: totalIdr,
      expires_at: expiresAt.toISOString(),
    };

    if (dto.payment_method === PaymentMethod.BANK_TRANSFER) {
      if (!dto.bank_code) throw new UnprocessableEntityException('BANK_NOT_SUPPORTED');

      const va = await this.midtrans.createVirtualAccount({
        orderId: order.id,
        bankCode: dto.bank_code,
        amountIdr: totalIdr,
        expiresAt,
        buyerName: order.user.fullName,
        buyerEmail: order.user.email,
      });

      paymentData = {
        ...paymentData,
        gatewayRef: va.gatewayRef,
        vaNumber: va.vaNumber,
        bankCode: dto.bank_code,
      };
      responseData.virtual_account = {
        bank_code: dto.bank_code,
        va_number: va.vaNumber,
        bank_name: this.getBankName(dto.bank_code),
        expires_at: expiresAt.toISOString(),
      };
    } else {
      const ewallet = await this.midtrans.createEwallet({
        orderId: order.id,
        amountIdr: totalIdr,
        method: dto.payment_method,
        returnUrl: dto.return_url,
        buyerName: order.user.fullName,
        buyerEmail: order.user.email,
      });

      paymentData = {
        ...paymentData,
        gatewayRef: ewallet.gatewayRef,
        redirectUrl: ewallet.redirectUrl,
      };
      responseData.redirect_url = ewallet.redirectUrl;
      responseData.deeplink_url = ewallet.deeplinkUrl;
      responseData.qr_url = ewallet.qrUrl;
    }

    const payment = await this.prisma.payment.create({ data: paymentData });
    // Update order with gateway fee
    await this.prisma.order.update({
      where: { id: order.id },
      data: { gatewayFeeIdr, totalIdr },
    });

    responseData.payment_id = payment.id;
    return responseData;
  }

  // ── Get Payment ───────────────────────────────────────────────────────────
  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('NOT_FOUND');
    if (payment.order.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    return {
      payment_id: payment.id,
      order_id: payment.orderId,
      method: payment.method,
      status: payment.status,
      amount_idr: payment.amountIdr,
      gateway_ref: payment.gatewayRef,
      paid_at: payment.paidAt?.toISOString() ?? null,
      created_at: payment.createdAt.toISOString(),
      updated_at: payment.updatedAt.toISOString(),
      va_number: payment.vaNumber,
      bank_code: payment.bankCode,
    };
  }

  // ── Webhook Handler (BR-PAY-006) ──────────────────────────────────────────
  async handleWebhook(gateway: string, payload: any, signature: string) {
    // Verify HMAC signature
    const valid = this.midtrans.verifyWebhookSignature(
      payload,
      signature || payload.signature_key || '',
    );
    // In sandbox/dev, we might skip strict verification
    if (!valid && process.env.NODE_ENV === 'production') {
      return { status: 'REJECTED' };
    }

    const parsed = this.midtrans.parseWebhook(payload);

    // BR-PAY-006: idempotency check
    const isNew = await this.redis.checkAndSetIdempotency(parsed.gatewayRef);
    if (!isNew) {
      return { status: 'OK' }; // already processed
    }

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef: parsed.gatewayRef },
      include: {
        order: {
          include: {
            items: { include: { ticketType: { include: { event: true } } } },
            user: true,
            event: true,
          },
        },
      },
    });

    if (!payment) return { status: 'OK' };

    if (parsed.status === 'SUCCESS') {
      await this.handlePaymentSuccess(payment, parsed.paidAt);
    } else if (parsed.status === 'FAILED') {
      await this.handlePaymentFailed(payment);
    }

    return { status: 'OK' };
  }

  private async handlePaymentSuccess(payment: any, paidAt?: Date) {
    const now = paidAt || new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: now },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: TicketStatus.ACTIVE },
      });

      // Create Ticket records
      const tickets: any[] = [];
      for (const item of payment.order.items) {
        for (let i = 0; i < item.quantity; i++) {
          const seat = item.seats?.[i] ?? null;
          const ticketId = `${payment.orderId}-${item.ticketTypeId}-${i}`;
          const qrToken = generateQrToken(ticketId);

          tickets.push(
            tx.ticket.create({
              data: {
                id: ticketId,
                orderId: payment.orderId,
                userId: payment.order.userId,
                ticketTypeId: item.ticketTypeId,
                status: TicketStatus.ACTIVE,
                seatNumber: seat,
                qrToken,
                purchasedAt: now,
              },
            }),
          );
        }
      }
      await Promise.all(tickets);

      // Update quotaSold
      for (const item of payment.order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { quotaSold: { increment: item.quantity } },
        });
      }
    });

    // WS push to buyer
    this.paymentStatusGateway.pushPaymentStatusChanged(payment.id, payment.orderId, {
      old_status: PaymentStatus.WAITING_PAYMENT,
      new_status: PaymentStatus.PAID,
      amount_idr: payment.amountIdr,
      paid_at: now.toISOString(),
      message: 'Pembayaran berhasil dikonfirmasi! Tiket Anda siap di halaman Tiket Saya.',
      redirect_to: '/me/tickets',
    });

    // WS push to organizer dashboard
    const eventId = payment.order.eventId;
    const seats = payment.order.items.flatMap((i: any) => i.seats || []);
    if (seats.length) this.seatsGateway.pushSeatSold(eventId, seats);

    this.organizerGateway.pushTicketSold(eventId, {
      quantity: payment.order.items.reduce((s: number, i: any) => s + i.quantity, 0),
      amount_idr: payment.amountIdr,
      buyer_name: payment.order.user.fullName,
      seats,
    });

    // Async: send email & PDF
    await this.queue.add('send-ticket-email', { orderId: payment.orderId });

    // Check capacity warning (< 10%)
    const event = payment.order.event;
    const totalSold = await this.prisma.ticket.count({
      where: { ticketType: { eventId }, status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] } },
    });
    const remainingPercent = ((event.maxCapacity - totalSold) / event.maxCapacity) * 100;
    if (remainingPercent < 10) {
      this.organizerGateway.pushCapacityWarning(eventId, {
        remaining_percent: remainingPercent,
        ticket_remaining: event.maxCapacity - totalSold,
        ticket_sold: totalSold,
      });
      await this.queue.add('send-capacity-warning', { eventId });
    }
  }

  private async handlePaymentFailed(payment: any) {
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: TicketStatus.EXPIRED },
      }),
    ]);

    // Release seat locks
    const items = await this.prisma.orderItem.findMany({ where: { orderId: payment.orderId } });
    const seats = items.flatMap((i) => i.seats);
    for (const seat of seats) await this.redis.releaseSeat(seat);
    if (seats.length) {
      this.seatsGateway.pushSeatReleased(payment.order.eventId, seats, 'PAYMENT_FAILED');
    }

    this.paymentStatusGateway.pushPaymentExpired(payment.id, payment.order.eventId);
  }

  // ── Refund Request (BR-PAY-005) ───────────────────────────────────────────
  async requestRefund(userId: string, dto: RefundRequestDto) {
    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: dto.ticket_ids }, userId },
      include: { ticketType: { include: { event: { include: { paymentConfig: true } } } } },
    });

    if (tickets.length !== dto.ticket_ids.length) throw new NotFoundException('TICKET_NOT_FOUND');

    const event = tickets[0].ticketType.event;
    const refundPolicy = event.paymentConfig?.refundPolicy ?? RefundPolicy.NO_REFUND;

    if (refundPolicy === RefundPolicy.NO_REFUND) {
      throw new UnprocessableEntityException('NO_REFUND_POLICY');
    }

    if (['ONGOING'].includes(event.status)) {
      throw new UnprocessableEntityException('EVENT_ONGOING');
    }

    const usedTickets = tickets.filter((t) => t.status === TicketStatus.USED);
    if (usedTickets.length) throw new UnprocessableEntityException('TICKETS_ALREADY_USED');

    // Calculate refund amount
    const refundPercent =
      refundPolicy === RefundPolicy.PARTIAL_REFUND
        ? (event.paymentConfig?.refundPercent ?? 100)
        : 100;

    const totalIdr = tickets.reduce(
      (sum, t) => sum + Math.ceil(t.ticketType.priceIdr * (refundPercent / 100)),
      0,
    );

    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        userId,
        eventId: event.id,
        reason: dto.reason,
        totalIdr,
        items: {
          create: tickets.map((t) => ({
            ticketId: t.id,
            amountIdr: Math.ceil(t.ticketType.priceIdr * (refundPercent / 100)),
          })),
        },
      },
    });

    return {
      refund_request_id: refundRequest.id,
      status: refundRequest.status,
      tickets_count: tickets.length,
      estimated_amount_idr: totalIdr,
      estimated_days: '3-7 hari kerja',
      submitted_at: refundRequest.submittedAt.toISOString(),
    };
  }

  // ── Get Refund ────────────────────────────────────────────────────────────
  async getRefund(userId: string, refundRequestId: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });

    if (!refund) throw new NotFoundException('NOT_FOUND');
    if (refund.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    return {
      refund_request_id: refund.id,
      status: refund.status,
      reason: refund.reason,
      refund_amount_idr: refund.totalIdr,
      refund_method: refund.refundMethod,
      submitted_at: refund.submittedAt.toISOString(),
      processed_at: refund.processedAt?.toISOString() ?? null,
      completed_at: refund.completedAt?.toISOString() ?? null,
      rejection_reason: refund.rejectedNote ?? null,
    };
  }

  // ── Bulk Refund (Internal — BR-PAY-002) ───────────────────────────────────
  async processBulkRefund(payload: { eventId: string; reason: string; triggeredBy: string }) {
    await this.queue.add('process-bulk-refund', payload);
    const affected = await this.prisma.ticket.count({
      where: {
        ticketType: { eventId: payload.eventId },
        status: { in: [TicketStatus.ACTIVE] },
      },
    });
    return { event_id: payload.eventId, affected_tickets: affected, status: 'PROCESSING' };
  }

  // ── Payout Status (BR-ORG-003) ────────────────────────────────────────────
  async getPayoutStatus(orgId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { org: true },
    });
    if (!event) throw new NotFoundException('EVENT_NOT_FOUND');
    if (event.orgId !== orgId) throw new ForbiddenException('FORBIDDEN');

    const payout = await this.prisma.payout.findUnique({ where: { eventId } });

    return {
      event_id: eventId,
      payout_status: payout?.status ?? 'PENDING',
      eligible_at: payout?.eligibleAt?.toISOString() ?? addDays(event.endAt, 7).toISOString(),
      revenue_gross_idr: payout?.revenueGrossIdr ?? 0,
      platform_fee_idr: payout?.platformFeeIdr ?? 0,
      gateway_fee_idr: payout?.gatewayFeeIdr ?? 0,
      refund_total_idr: payout?.refundTotalIdr ?? 0,
      revenue_net_idr: payout?.revenueNetIdr ?? 0,
      payout_amount_idr: payout?.payoutAmountIdr ?? 0,
      bank_account: event.org.bankAccount
        ? {
            bank_name: (event.org.bankAccount as any).bankName,
            account_name: (event.org.bankAccount as any).accountName,
            account_no: `****${((event.org.bankAccount as any).accountNo || '').slice(-4)}`,
          }
        : null,
      completed_at: payout?.completedAt?.toISOString() ?? null,
      hold_reason: payout?.holdReason ?? null,
    };
  }

  // ── Transaction History ───────────────────────────────────────────────────
  async getTransactions(
    userId: string,
    query: { status?: string; page?: number; per_page?: number },
  ) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;

    const where: any = {
      order: { userId },
      ...(query.status && { status: query.status }),
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        include: { order: { include: { event: true, items: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((p) => ({
        payment_id: p.id,
        order_id: p.orderId,
        event_title: p.order.event.title,
        method: p.method,
        amount_idr: p.amountIdr,
        status: p.status,
        paid_at: p.paidAt?.toISOString() ?? null,
        ticket_count: p.order.items.reduce((s, i) => s + i.quantity, 0),
      })),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  private getBankName(code: string): string {
    const map: Record<string, string> = {
      BCA: 'Bank Central Asia',
      BNI: 'Bank Negara Indonesia',
      BRI: 'Bank Rakyat Indonesia',
      MANDIRI: 'Bank Mandiri',
      PERMATA: 'Bank Permata',
    };
    return map[code.toUpperCase()] || code;
  }
}
