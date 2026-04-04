import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventStatus, LayoutType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { OrganizerGateway } from './organizer.gateway';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { SetPaymentConfigDto } from './dto/set-payment-config.dto';
import { minutesUntil, addDays } from '@eventhub/shared-utils';

const MAX_EDIT_WINDOW_MINUTES = 360; // 6 hours — BR-ORG-001
const WARN_EDIT_WINDOW_MINUTES = 1440; // 24 hours
const CAPACITY_BUFFER_PERCENT = 0.05; // 5% — BR-ORG-002

@Injectable()
export class OrganizerService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private gateway: OrganizerGateway,
  ) {}

  // ── Create Event ──────────────────────────────────────────────────────────
  async createEvent(orgId: string, dto: CreateEventDto) {
    const startAt = new Date(dto.start_at);
    const endAt = new Date(dto.end_at);

    if (startAt <= new Date()) throw new UnprocessableEntityException('START_IN_PAST');
    if (endAt <= startAt) throw new UnprocessableEntityException('INVALID_RANGE');

    const event = await this.prisma.event.create({
      data: {
        orgId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        startAt,
        endAt,
        maxCapacity: dto.max_capacity,
        bannerUrl: dto.banner_url,
        venueType: dto.venue.type,
        venueName: dto.venue.name,
        venueAddress: dto.venue.address,
        venueCity: dto.venue.city,
        venueLat: dto.venue.lat,
        venueLng: dto.venue.lng,
        onlineUrl: dto.venue.online_url,
      },
    });

    return {
      event_id: event.id,
      status: event.status,
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    };
  }

  // ── List Events ───────────────────────────────────────────────────────────
  async listEvents(
    orgId: string,
    query: {
      status?: EventStatus;
      page?: number;
      per_page?: number;
      sort?: string;
      order?: string;
    },
  ) {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 100);
    const skip = (page - 1) * perPage;

    const where = { orgId, ...(query.status ? { status: query.status } : {}) };

    const sortField = query.sort || 'createdAt';
    const sortOrder = query.order || 'desc';
    const validSortFields: Record<string, string> = {
      created_at: 'createdAt',
      start_at: 'startAt',
      title: 'title',
    };
    const orderByField = validSortFields[sortField] || 'createdAt';

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [orderByField]: sortOrder },
        include: { ticketTypes: true, _count: { select: { orders: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        event_id: e.id,
        title: e.title,
        status: e.status,
        start_at: e.startAt.toISOString(),
        ticket_sold: e.ticketTypes.reduce((sum, tt) => sum + tt.quotaSold, 0),
        revenue_idr: e.ticketTypes.reduce((sum, tt) => sum + tt.quotaSold * tt.priceIdr, 0),
        created_at: e.createdAt.toISOString(),
      })),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  // ── Get Event Detail ──────────────────────────────────────────────────────
  async getEvent(orgId: string, eventId: string) {
    const event = await this.findEventOwned(orgId, eventId);

    const ticketSold = event.ticketTypes.reduce((sum, tt) => sum + tt.quotaSold, 0);
    const revenueGross = event.ticketTypes.reduce((sum, tt) => sum + tt.quotaSold * tt.priceIdr, 0);

    return {
      event_id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      start_at: event.startAt.toISOString(),
      end_at: event.endAt.toISOString(),
      venue: this.formatVenue(event),
      max_capacity: event.maxCapacity,
      banner_url: event.bannerUrl,
      layout: event.layout
        ? { layout_id: event.layout.id, type: event.layout.type, data: event.layout.data }
        : null,
      tickets: event.ticketTypes.map((tt) => ({
        ticket_type_id: tt.id,
        name: tt.name,
        price_idr: tt.priceIdr,
        quota: tt.quota,
        quota_sold: tt.quotaSold,
        is_active: tt.isActive,
        sale_start_at: tt.saleStartAt.toISOString(),
        sale_end_at: tt.saleEndAt.toISOString(),
      })),
      payment_config: event.paymentConfig
        ? {
            payment_methods: event.paymentConfig.paymentMethods,
            fee_bearer: event.paymentConfig.feeBearer,
            refund_policy: event.paymentConfig.refundPolicy,
            refund_percent: event.paymentConfig.refundPercent,
          }
        : null,
      stats: {
        ticket_sold: ticketSold,
        ticket_remaining: event.maxCapacity - ticketSold,
        revenue_gross_idr: revenueGross,
        checkin_count: 0,
      },
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    };
  }

  // ── Update Event (BR-ORG-001) ─────────────────────────────────────────────
  async updateEvent(orgId: string, eventId: string, dto: Partial<CreateEventDto>) {
    const event = await this.findEventOwned(orgId, eventId);
    if (event.status === EventStatus.COMPLETED || event.status === EventStatus.CANCELLED) {
      throw new UnprocessableEntityException('CANNOT_EDIT_COMPLETED');
    }

    const warnings: string[] = [];
    const isChangingDateTime = dto.start_at || dto.end_at;
    const isChangingVenue = dto.venue?.address || dto.venue?.city || dto.venue?.lat;

    if (isChangingDateTime || isChangingVenue) {
      const minsUntilStart = minutesUntil(event.startAt);
      if (minsUntilStart >= 0 && minsUntilStart < MAX_EDIT_WINDOW_MINUTES) {
        throw new UnprocessableEntityException('LOCKED_FIELD');
      }
      if (minsUntilStart >= 0 && minsUntilStart < WARN_EDIT_WINDOW_MINUTES) {
        const soldCount = event.ticketTypes.reduce((s, tt) => s + tt.quotaSold, 0);
        warnings.push(
          `Perubahan waktu < 24 jam — notifikasi akan dikirim ke ${soldCount} pembeli tiket.`,
        );
        await this.queue.add('send-event-postponed-notification', { eventId });
      }
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.start_at && { startAt: new Date(dto.start_at) }),
        ...(dto.end_at && { endAt: new Date(dto.end_at) }),
        ...(dto.max_capacity && { maxCapacity: dto.max_capacity }),
        ...(dto.banner_url !== undefined && { bannerUrl: dto.banner_url }),
        ...(dto.venue?.name && { venueName: dto.venue.name }),
        ...(dto.venue?.address && { venueAddress: dto.venue.address }),
        ...(dto.venue?.city && { venueCity: dto.venue.city }),
        ...(dto.venue?.lat && { venueLat: dto.venue.lat }),
        ...(dto.venue?.lng && { venueLng: dto.venue.lng }),
        ...(dto.venue?.online_url && { onlineUrl: dto.venue.online_url }),
      },
    });

    return {
      data: { event_id: updated.id, updated_at: updated.updatedAt.toISOString() },
      warnings,
    };
  }

  // ── Delete Event ──────────────────────────────────────────────────────────
  async deleteEvent(orgId: string, eventId: string) {
    const event = await this.findEventOwned(orgId, eventId);
    if (event.status !== EventStatus.DRAFT) {
      const hasSold = event.ticketTypes.some((tt) => tt.quotaSold > 0);
      if (hasSold) throw new ConflictException('HAS_SOLD_TICKETS');
    }
    await this.prisma.event.delete({ where: { id: eventId } });
  }

  // ── Publish Event (BR-ORG-004, BR-ORG-002) ────────────────────────────────
  async publishEvent(orgId: string, eventId: string) {
    const event = await this.findEventOwned(orgId, eventId);

    if (!event.title || !event.description || !event.startAt || !event.venueType) {
      throw new UnprocessableEntityException('MISSING_REQUIRED_FIELDS');
    }

    const activeTickets = event.ticketTypes.filter((tt) => tt.isActive);
    if (!activeTickets.length) throw new UnprocessableEntityException('NO_ACTIVE_TICKET');

    const totalQuota = activeTickets.reduce((sum, tt) => sum + tt.quota, 0);
    if (totalQuota > event.maxCapacity * (1 + CAPACITY_BUFFER_PERCENT)) {
      throw new UnprocessableEntityException('CAPACITY_EXCEEDED');
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
    });

    this.gateway.pushEventStatusChanged(eventId, event.status, EventStatus.PUBLISHED);

    return { event_id: updated.id, status: updated.status };
  }

  // ── Cancel Event (BR-ORG-005, BR-PAY-002) ─────────────────────────────────
  async cancelEvent(orgId: string, eventId: string, reason: string) {
    const event = await this.findEventOwned(orgId, eventId);

    if (event.status === EventStatus.CANCELLED) {
      throw new ConflictException('ALREADY_CANCELLED');
    }

    const affectedOrders = await this.prisma.order.count({
      where: { eventId, status: 'ACTIVE' },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.CANCELLED, cancelReason: reason },
    });

    // Trigger bulk refund (BR-ORG-005 / BR-PAY-002)
    await this.queue.add('process-bulk-refund', { eventId, reason });
    await this.queue.add('send-event-cancelled-notification', { eventId });

    this.gateway.pushEventStatusChanged(eventId, event.status, EventStatus.CANCELLED);

    return {
      event_id: eventId,
      status: EventStatus.CANCELLED,
      refund_triggered: true,
      affected_buyers: affectedOrders,
    };
  }

  // ── Postpone Event ────────────────────────────────────────────────────────
  async postponeEvent(
    orgId: string,
    eventId: string,
    newStartAt: string,
    newEndAt: string,
    reason: string,
  ) {
    const event = await this.findEventOwned(orgId, eventId);

    const startAt = new Date(newStartAt);
    const endAt = new Date(newEndAt);
    if (endAt <= startAt) throw new UnprocessableEntityException('INVALID_RANGE');

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.POSTPONED,
        startAt,
        endAt,
        postponeReason: reason,
      },
    });

    await this.queue.add('send-event-postponed-notification', { eventId });
    this.gateway.pushEventStatusChanged(eventId, event.status, EventStatus.POSTPONED);

    return {
      event_id: updated.id,
      status: updated.status,
      new_start_at: updated.startAt.toISOString(),
    };
  }

  // ── Set Layout ────────────────────────────────────────────────────────────
  async setLayout(orgId: string, eventId: string, dto: { type: LayoutType; data: any }) {
    await this.findEventOwned(orgId, eventId);

    const existingLayout = await this.prisma.eventLayout.findUnique({ where: { eventId } });

    const layout = existingLayout
      ? await this.prisma.eventLayout.update({
          where: { eventId },
          data: { type: dto.type, data: dto.data },
        })
      : await this.prisma.eventLayout.create({
          data: { eventId, type: dto.type, data: dto.data },
        });

    const totalSeats =
      dto.type === LayoutType.SEAT_MAP
        ? (dto.data.rows || []).reduce((sum: number, row: any) => sum + (row.seats?.length || 0), 0)
        : (dto.data.zones || []).reduce((sum: number, z: any) => sum + (z.capacity || 0), 0);

    return {
      layout_id: layout.id,
      type: layout.type,
      total_seats: totalSeats,
      updated_at: layout.updatedAt.toISOString(),
    };
  }

  // ── Add Ticket Type ───────────────────────────────────────────────────────
  async addTicketType(orgId: string, eventId: string, dto: CreateTicketTypeDto) {
    const event = await this.findEventOwned(orgId, eventId);

    const existingCount = event.ticketTypes.length;
    if (existingCount >= 10) throw new UnprocessableEntityException('MAX_TICKET_TYPES_REACHED');

    const totalExistingQuota = event.ticketTypes.reduce((sum, tt) => sum + tt.quota, 0);
    if (totalExistingQuota + dto.quota > event.maxCapacity * (1 + CAPACITY_BUFFER_PERCENT)) {
      throw new UnprocessableEntityException('QUOTA_EXCEED_CAPACITY');
    }

    const saleStart = new Date(dto.sale_start_at);
    const saleEnd = new Date(dto.sale_end_at);
    if (saleEnd <= saleStart || saleEnd > event.endAt) {
      throw new UnprocessableEntityException('INVALID_SALE_RANGE');
    }

    const ticketType = await this.prisma.ticketType.create({
      data: {
        eventId,
        name: dto.name,
        description: dto.description,
        priceIdr: dto.price_idr,
        quota: dto.quota,
        saleStartAt: saleStart,
        saleEndAt: saleEnd,
        maxPerUser: dto.max_per_user ?? 5,
        zoneId: dto.zone_id,
      },
    });

    return {
      ticket_type_id: ticketType.id,
      name: ticketType.name,
      price_idr: ticketType.priceIdr,
      quota: ticketType.quota,
      status: 'ACTIVE',
      created_at: ticketType.createdAt.toISOString(),
    };
  }

  // ── Update Ticket Type ────────────────────────────────────────────────────
  async updateTicketType(
    orgId: string,
    eventId: string,
    ticketTypeId: string,
    dto: UpdateTicketTypeDto,
  ) {
    await this.findEventOwned(orgId, eventId);

    const tt = await this.prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId },
    });
    if (!tt) throw new NotFoundException('NOT_FOUND');

    if (dto.quota !== undefined && dto.quota < tt.quotaSold) {
      throw new ConflictException('QUOTA_BELOW_SOLD');
    }

    const updated = await this.prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.price_idr !== undefined && { priceIdr: dto.price_idr }),
        ...(dto.quota !== undefined && { quota: dto.quota }),
        ...(dto.sale_start_at && { saleStartAt: new Date(dto.sale_start_at) }),
        ...(dto.sale_end_at && { saleEndAt: new Date(dto.sale_end_at) }),
        ...(dto.is_active !== undefined && { isActive: dto.is_active }),
        ...(dto.max_per_user && { maxPerUser: dto.max_per_user }),
      },
    });

    return { ticket_type_id: updated.id, updated_at: updated.updatedAt.toISOString() };
  }

  // ── Set Payment Config ────────────────────────────────────────────────────
  async setPaymentConfig(orgId: string, eventId: string, dto: SetPaymentConfigDto) {
    await this.findEventOwned(orgId, eventId);

    const config = await this.prisma.paymentConfig.upsert({
      where: { eventId },
      create: {
        eventId,
        paymentMethods: dto.payment_methods,
        feeBearer: dto.fee_bearer,
        refundPolicy: dto.refund_policy,
        refundPercent: dto.refund_percent,
      },
      update: {
        paymentMethods: dto.payment_methods,
        feeBearer: dto.fee_bearer,
        refundPolicy: dto.refund_policy,
        refundPercent: dto.refund_percent,
      },
    });

    return {
      event_id: eventId,
      payment_methods: config.paymentMethods,
      fee_bearer: config.feeBearer,
      refund_policy: config.refundPolicy,
      refund_percent: config.refundPercent,
    };
  }

  // ── Get Report ────────────────────────────────────────────────────────────
  async getReport(orgId: string, eventId: string, includeTransactions = false) {
    const event = await this.findEventOwned(orgId, eventId);

    const ticketTypes = event.ticketTypes;
    const revenueGross = ticketTypes.reduce((sum, tt) => sum + tt.quotaSold * tt.priceIdr, 0);
    const platformFee = Math.ceil(revenueGross * 0.03);

    const payout = await this.prisma.payout.findUnique({ where: { eventId } });

    return {
      event_id: eventId,
      period: { start: event.startAt.toISOString(), end: event.endAt.toISOString() },
      summary: {
        ticket_sold: ticketTypes.reduce((sum, tt) => sum + tt.quotaSold, 0),
        revenue_gross_idr: revenueGross,
        platform_fee_idr: platformFee,
        gateway_fee_idr: 0,
        revenue_net_idr: revenueGross - platformFee,
        refund_total_idr: 0,
        payout_status: payout?.status ?? 'PENDING',
      },
      by_ticket_type: ticketTypes.map((tt) => ({
        ticket_type_id: tt.id,
        name: tt.name,
        sold: tt.quotaSold,
        revenue_idr: tt.quotaSold * tt.priceIdr,
      })),
    };
  }

  // ── Get Attendees ─────────────────────────────────────────────────────────
  async getAttendees(orgId: string, eventId: string, query: { page?: number; per_page?: number }) {
    await this.findEventOwned(orgId, eventId);

    const page = query.page || 1;
    const perPage = query.per_page || 20;

    const [tickets, totalCheckin] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { ticketType: { eventId }, status: 'USED' },
        include: { user: true, ticketType: true },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.ticket.count({ where: { ticketType: { eventId }, status: 'USED' } }),
    ]);

    const totalSold = await this.prisma.ticket.count({
      where: { ticketType: { eventId }, status: { in: ['ACTIVE', 'USED'] } },
    });

    return {
      data: tickets.map((t) => ({
        ticket_id: t.id,
        ticket_type: t.ticketType.name,
        holder_name: t.user.fullName,
        seat: t.seatNumber ?? (t.zoneId ? `zone:${t.zoneId}` : null),
        checkin_at: t.checkinAt?.toISOString() ?? null,
        checkin_by: t.checkinBy,
      })),
      meta: { total_checkin: totalCheckin, total_sold: totalSold },
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────
  private async findEventOwned(orgId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true, layout: true, paymentConfig: true },
    });

    if (!event) throw new NotFoundException('EVENT_NOT_FOUND');
    if (event.orgId !== orgId) throw new ForbiddenException('FORBIDDEN');

    return event;
  }

  private formatVenue(event: any) {
    return {
      type: event.venueType,
      name: event.venueName,
      address: event.venueAddress,
      city: event.venueCity,
      lat: event.venueLat,
      lng: event.venueLng,
      online_url: event.onlineUrl,
    };
  }
}
