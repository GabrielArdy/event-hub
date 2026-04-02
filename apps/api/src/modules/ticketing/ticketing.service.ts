import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventStatus, LayoutType, TicketStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { QueueService } from '../../common/queue/queue.service';
import { SeatsGateway } from './gateways/seats.gateway';
import { OrganizerGateway } from '../organizer/organizer.gateway';
import { OrderStatusGateway } from './gateways/order-status.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { generateQrToken, verifyQrToken } from '../../common/utils/qr-token.util';
import {
  calculatePlatformFee,
  calculateGatewayFee,
} from '../../common/utils/fee-calculator.util';
import { PaymentMethod } from '@prisma/client';

const SEAT_LOCK_TTL = 600; // BR-TKT-001: 10 minutes
const ORDER_EXPIRY_MINUTES = 10;

@Injectable()
export class TicketingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private queue: QueueService,
    private seatsGateway: SeatsGateway,
    private organizerGateway: OrganizerGateway,
    private orderStatusGateway: OrderStatusGateway,
  ) {}

  // ── Public Event Listing ──────────────────────────────────────────────────
  async getPublicEvents(query: {
    q?: string;
    category?: string;
    city?: string;
    date_from?: string;
    date_to?: string;
    price_min?: number;
    price_max?: number;
    status?: string;
    page?: number;
    per_page?: number;
    sort?: string;
  }) {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);
    const skip = (page - 1) * perPage;

    const where: any = {
      status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING] },
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.city) where.venueCity = { contains: query.city, mode: 'insensitive' };
    if (query.date_from) where.startAt = { gte: new Date(query.date_from) };
    if (query.date_to) where.endAt = { lte: new Date(query.date_to) };
    if (query.status) where.status = query.status;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { startAt: 'asc' },
        include: {
          ticketTypes: { where: { isActive: true } },
          org: true,
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        event_id: e.id,
        title: e.title,
        category: e.category,
        status: e.status,
        start_at: e.startAt.toISOString(),
        venue: { type: e.venueType, name: e.venueName, city: e.venueCity },
        banner_url: e.bannerUrl,
        price_min_idr: Math.min(...e.ticketTypes.map((tt) => tt.priceIdr), 0),
        price_max_idr: Math.max(...e.ticketTypes.map((tt) => tt.priceIdr), 0),
        ticket_available: e.ticketTypes.some((tt) => tt.quota - tt.quotaSold > 0),
        organizer: { org_name: e.org.orgName, avatar_url: null },
      })),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  // ── Public Event Detail ───────────────────────────────────────────────────
  async getPublicEvent(eventId: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: { where: { isActive: true } },
        layout: true,
        org: true,
        wishlists: userId ? { where: { userId } } : false,
      },
    });

    if (!event) throw new NotFoundException('EVENT_NOT_FOUND');
    if ([EventStatus.DRAFT, EventStatus.CANCELLED].includes(event.status)) {
      throw new NotFoundException('EVENT_UNAVAILABLE');
    }

    return {
      event_id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      start_at: event.startAt.toISOString(),
      end_at: event.endAt.toISOString(),
      venue: {
        type: event.venueType,
        name: event.venueName,
        address: event.venueAddress,
        city: event.venueCity,
        lat: event.venueLat,
        lng: event.venueLng,
      },
      banner_url: event.bannerUrl,
      organizer: { org_name: event.org.orgName, avatar_url: null },
      ticket_types: event.ticketTypes.map((tt) => ({
        ticket_type_id: tt.id,
        name: tt.name,
        description: tt.description,
        price_idr: tt.priceIdr,
        quota: tt.quota,
        quota_remaining: tt.quota - tt.quotaSold,
        sale_start_at: tt.saleStartAt.toISOString(),
        sale_end_at: tt.saleEndAt.toISOString(),
        is_available: tt.isActive && tt.quota - tt.quotaSold > 0,
        max_per_user: tt.maxPerUser,
      })),
      layout: event.layout ? { type: event.layout.type, data: event.layout.data } : null,
      is_wishlisted: userId ? (event.wishlists as any[]).length > 0 : false,
    };
  }

  // ── Seat Map ──────────────────────────────────────────────────────────────
  async getSeatMap(eventId: string) {
    const layout = await this.prisma.eventLayout.findUnique({ where: { eventId } });
    if (!layout || layout.type !== LayoutType.SEAT_MAP) {
      throw new NotFoundException('SEAT_MAP_NOT_FOUND');
    }

    return {
      layout_type: layout.type,
      rows: (layout.data as any).rows || [],
      snapshot_at: new Date().toISOString(),
    };
  }

  // ── Create Order (BR-TKT-001, BR-TKT-002, BR-TKT-005) ─────────────────────
  async createOrder(userId: string, dto: CreateOrderDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.event_id },
      include: { paymentConfig: true },
    });

    if (!event) throw new NotFoundException('EVENT_NOT_FOUND');
    if (event.status !== EventStatus.PUBLISHED) {
      throw new UnprocessableEntityException('EVENT_NOT_AVAILABLE');
    }

    const seatsToLock: string[] = [];
    let subtotalIdr = 0;
    const orderId = randomUUID();
    const itemsData: any[] = [];

    for (const item of dto.items) {
      const ticketType = await this.prisma.ticketType.findFirst({
        where: { id: item.ticket_type_id, eventId: dto.event_id, isActive: true },
      });
      if (!ticketType) throw new NotFoundException('TICKET_TYPE_NOT_FOUND');

      const now = new Date();
      if (now < ticketType.saleStartAt) throw new UnprocessableEntityException('SALE_NOT_STARTED');
      if (now > ticketType.saleEndAt) throw new UnprocessableEntityException('SALE_ENDED');
      if (ticketType.quota - ticketType.quotaSold < item.quantity) {
        throw new ConflictException('QUOTA_EXCEEDED');
      }

      // BR-TKT-002: max per user
      const userTicketCount = await this.prisma.ticket.count({
        where: {
          userId,
          ticketTypeId: item.ticket_type_id,
          status: { in: [TicketStatus.ACTIVE, TicketStatus.PENDING_PAYMENT] },
        },
      });
      if (userTicketCount + item.quantity > ticketType.maxPerUser) {
        throw new ConflictException('USER_QUOTA_EXCEEDED');
      }

      // Seat map validation
      if (event.venueType === 'PHYSICAL') {
        const layout = await this.prisma.eventLayout.findUnique({ where: { eventId: dto.event_id } });
        if (layout?.type === LayoutType.SEAT_MAP) {
          if (!item.seats || item.seats.length !== item.quantity) {
            throw new UnprocessableEntityException('SEATS_REQUIRED');
          }
          seatsToLock.push(...item.seats);
        }
      }

      subtotalIdr += ticketType.priceIdr * item.quantity;
      itemsData.push({
        ticketTypeId: item.ticket_type_id,
        quantity: item.quantity,
        unitPriceIdr: ticketType.priceIdr,
        subtotalIdr: ticketType.priceIdr * item.quantity,
        seats: item.seats ?? [],
      });
    }

    // Lock seats atomically (BR-TKT-001)
    const lockedSeats: string[] = [];
    for (const seatId of seatsToLock) {
      const locked = await this.redis.lockSeat(seatId, orderId, SEAT_LOCK_TTL);
      if (!locked) {
        // Rollback already locked seats
        for (const s of lockedSeats) await this.redis.releaseSeat(s);
        throw new ConflictException('SEAT_LOCKED');
      }
      lockedSeats.push(seatId);
    }

    // Calculate fees
    const feeBearer = event.paymentConfig?.feeBearer ?? 'BUYER';
    const platformFeeIdr = feeBearer === 'BUYER' ? calculatePlatformFee(subtotalIdr) : 0;
    const totalIdr = subtotalIdr + platformFeeIdr;
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);

    // Persist order
    const order = await this.prisma.order.create({
      data: {
        id: orderId,
        userId,
        eventId: dto.event_id,
        status: TicketStatus.PENDING_PAYMENT,
        expiresAt,
        subtotalIdr,
        platformFeeIdr,
        gatewayFeeIdr: 0,
        totalIdr,
        items: { create: itemsData },
      },
      include: { items: { include: { ticketType: true } } },
    });

    // BullMQ fallback release job (BR-TKT-001)
    await this.queue.add(
      'release-seat-lock',
      { orderId: order.id, seats: seatsToLock },
      { delay: ORDER_EXPIRY_MINUTES * 60 * 1000, jobId: `release:${order.id}` },
    );

    // WS push SEAT_LOCKED
    if (seatsToLock.length) {
      this.seatsGateway.pushSeatLocked(dto.event_id, { seats: seatsToLock, lockedUntil: expiresAt });
    }

    return {
      order_id: order.id,
      status: order.status,
      expires_at: order.expiresAt.toISOString(),
      items: order.items.map((item) => ({
        ticket_type_id: item.ticketTypeId,
        name: item.ticketType.name,
        quantity: item.quantity,
        unit_price_idr: item.unitPriceIdr,
        subtotal_idr: item.subtotalIdr,
        seats: item.seats,
      })),
      subtotal_idr: order.subtotalIdr,
      platform_fee_idr: order.platformFeeIdr,
      total_idr: order.totalIdr,
      created_at: order.createdAt.toISOString(),
    };
  }

  // ── Get Order ─────────────────────────────────────────────────────────────
  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticketType: true } }, payment: true, tickets: true },
    });

    if (!order) throw new NotFoundException('NOT_FOUND');
    if (order.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    return {
      order_id: order.id,
      status: order.status,
      expires_at: order.expiresAt.toISOString(),
      total_idr: order.totalIdr,
      payment: order.payment
        ? { payment_id: order.payment.id, status: order.payment.status }
        : null,
      tickets: order.tickets.map((t) => ({ ticket_id: t.id, status: t.status })),
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
  }

  // ── My Tickets ────────────────────────────────────────────────────────────
  async getMyTickets(
    userId: string,
    query: { status?: TicketStatus; page?: number; per_page?: number },
  ) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { userId, status: query.status || TicketStatus.ACTIVE },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { ticketType: { include: { event: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where: { userId, status: query.status || TicketStatus.ACTIVE } }),
    ]);

    return {
      data: tickets.map((t) => this.formatTicket(t)),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  // ── Get Single Ticket ─────────────────────────────────────────────────────
  async getMyTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { ticketType: { include: { event: true } }, user: true },
    });

    if (!ticket) throw new NotFoundException('NOT_FOUND');
    if (ticket.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    return this.formatTicket(ticket);
  }

  // ── Validate Ticket QR (BR-TKT-003) ──────────────────────────────────────
  async validateTicket(staffUserId: string, ticketId: string, dto: ValidateTicketDto) {
    const qrResult = verifyQrToken(dto.qr_token);
    if (!qrResult) {
      return { success: false, data: { status: 'INVALID', message: 'QR code tidak valid.' } };
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: qrResult.ticketId },
      include: { ticketType: { include: { event: true } }, user: true },
    });

    if (!ticket) {
      return { success: false, data: { status: 'NOT_FOUND', message: 'Tiket tidak ditemukan.' } };
    }

    if (ticket.status === TicketStatus.USED) {
      return {
        success: false,
        data: {
          status: 'ALREADY_USED',
          message: `Tiket ini sudah pernah digunakan pada ${ticket.usedAt?.toISOString()}.`,
          used_at: ticket.usedAt?.toISOString(),
        },
      };
    }

    if (ticket.status === TicketStatus.EXPIRED) {
      return { success: false, data: { status: 'EXPIRED', message: 'Tiket sudah kadaluwarsa.' } };
    }

    if (ticket.status === TicketStatus.REFUNDED) {
      return { success: false, data: { status: 'REFUNDED', message: 'Tiket sudah di-refund.' } };
    }

    if (ticket.status !== TicketStatus.ACTIVE) {
      return { success: false, data: { status: 'INVALID', message: 'Status tiket tidak valid.' } };
    }

    const now = new Date();
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.USED, checkinAt: now, checkinBy: staffUserId, usedAt: now },
    });

    // WS push CHECKIN_UPDATE to organizer dashboard (BR-TKT-003)
    const totalCheckin = await this.prisma.ticket.count({
      where: { ticketType: { eventId: ticket.ticketType.eventId }, status: TicketStatus.USED },
    });

    this.organizerGateway.pushCheckinUpdate(ticket.ticketType.eventId, {
      ticket_id: ticket.id,
      holder_name: ticket.user.fullName,
      ticket_type: ticket.ticketType.name,
      seat: ticket.seatNumber,
      checkin_by: staffUserId,
      total_checkin: totalCheckin,
    });

    return {
      success: true,
      data: {
        ticket_id: ticket.id,
        status: 'VALID',
        holder_name: ticket.user.fullName,
        ticket_type: ticket.ticketType.name,
        seat: ticket.seatNumber,
        event_title: ticket.ticketType.event.title,
        validated_at: now.toISOString(),
      },
    };
  }

  // ── Wishlist Toggle ───────────────────────────────────────────────────────
  async toggleWishlist(userId: string, eventId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({ where: { id: existing.id } });
      return { success: true, is_wishlisted: false, message: 'Acara dihapus dari wishlist.' };
    } else {
      await this.prisma.wishlist.create({ data: { userId, eventId } });
      return { success: true, is_wishlisted: true, message: 'Acara ditambahkan ke wishlist.' };
    }
  }

  // ── Get Wishlist ──────────────────────────────────────────────────────────
  async getWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: { event: { include: { ticketTypes: { where: { isActive: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: items.map((w) => ({
        event_id: w.event.id,
        title: w.event.title,
        start_at: w.event.startAt.toISOString(),
        price_min_idr: Math.min(...w.event.ticketTypes.map((tt) => tt.priceIdr), 0),
        ticket_available: w.event.ticketTypes.some((tt) => tt.quota - tt.quotaSold > 0),
        wishlisted_at: w.createdAt.toISOString(),
      })),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private formatTicket(t: any) {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    return {
      ticket_id: t.id,
      order_id: t.orderId,
      status: t.status,
      event: {
        event_id: t.ticketType.event.id,
        title: t.ticketType.event.title,
        start_at: t.ticketType.event.startAt.toISOString(),
        venue_name: t.ticketType.event.venueName,
      },
      ticket_type: t.ticketType.name,
      seat: t.seatNumber ?? (t.zoneId ? `zone:${t.zoneId}` : null),
      qr_token: t.qrToken,
      qr_url: `${baseUrl}/api/v1/tickets/${t.id}/qr.png`,
      pdf_url: `${baseUrl}/api/v1/tickets/${t.id}/download.pdf`,
      purchased_at: t.purchasedAt?.toISOString() ?? null,
      used_at: t.usedAt?.toISOString() ?? null,
    };
  }
}
