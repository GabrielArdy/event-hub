export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'GOPAY'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY';
export type PaymentStatus = 'WAITING_PAYMENT' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
export type RefundStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
export type PayoutStatus = 'PENDING' | 'ELIGIBLE' | 'PROCESSING' | 'COMPLETED' | 'ON_HOLD';
export type RefundPolicy = 'NO_REFUND' | 'FULL_REFUND' | 'PARTIAL_REFUND';
export type FeeBearer = 'BUYER' | 'ORGANIZER';

export interface PaymentDetail {
  payment_id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount_idr: number;
  gateway_ref: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  virtual_account?: VirtualAccountInfo;
  redirect_url?: string;
  deeplink_url?: string;
  qr_url?: string;
  expires_at: string;
}

export interface VirtualAccountInfo {
  bank_code: string;
  va_number: string;
  bank_name: string;
  expires_at: string;
}

export interface RefundRequestDetail {
  refund_request_id: string;
  status: RefundStatus;
  reason: string;
  refund_amount_idr: number;
  refund_method: string;
  submitted_at: string;
  processed_at: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
}

export interface PayoutDetail {
  event_id: string;
  payout_status: PayoutStatus;
  eligible_at: string;
  revenue_gross_idr: number;
  platform_fee_idr: number;
  gateway_fee_idr: number;
  refund_total_idr: number;
  revenue_net_idr: number;
  payout_amount_idr: number;
  bank_account: BankAccount | null;
  completed_at: string | null;
  hold_reason: string | null;
}

export interface BankAccount {
  bank_name: string;
  account_name: string;
  account_no: string;
}

// WebSocket
export interface WsPaymentStatusPayload {
  old_status: PaymentStatus;
  new_status: PaymentStatus;
  amount_idr: number;
  paid_at?: string;
  message: string;
  redirect_to?: string;
}

export interface WsRefundStatusPayload {
  old_status: RefundStatus;
  new_status: RefundStatus;
  amount_idr: number;
  message: string;
}
