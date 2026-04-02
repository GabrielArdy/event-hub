export type TicketStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'REFUNDED';

export interface OrderSummary {
  order_id: string;
  status: TicketStatus;
  expires_at: string;
  items: OrderItemSummary[];
  subtotal_idr: number;
  platform_fee_idr: number;
  gateway_fee_idr: number;
  total_idr: number;
  created_at: string;
}

export interface OrderItemSummary {
  ticket_type_id: string;
  name: string;
  quantity: number;
  unit_price_idr: number;
  subtotal_idr: number;
  seats: string[];
}

export interface TicketInfo {
  ticket_id: string;
  order_id: string;
  status: TicketStatus;
  event: {
    event_id: string;
    title: string;
    start_at: string;
    venue_name: string | null;
  };
  ticket_type: string;
  seat: string | null;
  qr_token: string;
  qr_url: string;
  pdf_url: string;
  purchased_at: string | null;
  used_at: string | null;
}

export interface ValidateTicketResult {
  status: 'VALID' | 'ALREADY_USED' | 'EXPIRED' | 'REFUNDED' | 'WRONG_EVENT';
  ticket_id?: string;
  holder_name?: string;
  ticket_type?: string;
  seat?: string | null;
  event_title?: string;
  validated_at?: string;
  message?: string;
  used_at?: string | null;
}

// WebSocket
export interface WsOrderStatusPayload {
  old_status: TicketStatus;
  new_status: TicketStatus;
  ticket_ids?: string[];
  message: string;
}
