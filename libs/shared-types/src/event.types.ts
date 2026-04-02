export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
export type EventCategory = 'MUSIC' | 'SEMINAR' | 'SPORT' | 'EXHIBITION' | 'COMEDY' | 'OTHER';
export type VenueType = 'PHYSICAL' | 'ONLINE';
export type LayoutType = 'SEAT_MAP' | 'ZONE';
export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'SOLD' | 'UNAVAILABLE';

export interface VenueInfo {
  type: VenueType;
  name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  online_url?: string;
}

export interface EventSummary {
  event_id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  start_at: string;
  venue: Pick<VenueInfo, 'type' | 'name' | 'city'>;
  banner_url: string | null;
  price_min_idr: number;
  price_max_idr: number;
  ticket_available: boolean;
  organizer: {
    org_name: string;
    avatar_url: string | null;
  };
}

export interface EventDetail extends EventSummary {
  description: string;
  end_at: string;
  max_capacity: number;
  ticket_types: TicketTypeSummary[];
  layout: LayoutData | null;
  is_wishlisted: boolean;
}

export interface TicketTypeSummary {
  ticket_type_id: string;
  name: string;
  description: string | null;
  price_idr: number;
  quota: number;
  quota_remaining: number;
  sale_start_at: string;
  sale_end_at: string;
  is_available: boolean;
  max_per_user: number;
}

export interface LayoutData {
  type: LayoutType;
  data: SeatMapData | ZoneData;
}

export interface SeatMapData {
  rows: SeatRow[];
}

export interface SeatRow {
  row_label: string;
  seats: SeatInfo[];
}

export interface SeatInfo {
  seat_number: string;
  status: SeatStatus;
  ticket_type?: string;
  price_idr?: number;
}

export interface ZoneData {
  zones: ZoneInfo[];
}

export interface ZoneInfo {
  zone_id: string;
  zone_name: string;
  capacity: number;
  capacity_remaining?: number;
  color_hex: string;
  is_available?: boolean;
}

// WebSocket event types
export interface WsSeatLockedPayload {
  seats: string[];
  locked_until: string;
  is_mine: boolean;
}

export interface WsSeatReleasedPayload {
  seats: string[];
  reason: 'TIMEOUT' | 'USER_CANCELLED' | 'PAYMENT_FAILED';
}

export interface WsSeatSoldPayload {
  seats: string[];
}

export interface WsZoneUpdatePayload {
  zones: Array<{
    zone_id: string;
    zone_name: string;
    capacity_remaining: number;
    is_available: boolean;
  }>;
}
