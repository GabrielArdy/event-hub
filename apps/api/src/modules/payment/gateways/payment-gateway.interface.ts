export interface CreateVAParams {
  orderId: string;
  bankCode: string;
  amountIdr: number;
  expiresAt: Date;
  buyerName: string;
  buyerEmail: string;
}

export interface CreateEwalletParams {
  orderId: string;
  amountIdr: number;
  method: string;
  returnUrl?: string;
  buyerName?: string;
  buyerEmail?: string;
}

export interface VirtualAccountResult {
  vaNumber: string;
  bankCode: string;
  expiresAt: Date;
  gatewayRef: string;
}

export interface EwalletResult {
  redirectUrl: string;
  deeplinkUrl?: string;
  qrUrl?: string;
  gatewayRef: string;
}

export interface WebhookResult {
  gatewayRef: string;
  orderId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amountIdr: number;
  paidAt?: Date;
}

export interface RefundResult {
  refundRef: string;
  status: 'PENDING' | 'SUCCESS';
}

export interface PaymentGateway {
  createVirtualAccount(params: CreateVAParams): Promise<VirtualAccountResult>;
  createEwallet(params: CreateEwalletParams): Promise<EwalletResult>;
  verifyWebhookSignature(payload: any, signature: string): boolean;
  parseWebhook(payload: any): WebhookResult;
  processRefund(gatewayRef: string, amountIdr: number, orderId: string): Promise<RefundResult>;
}
