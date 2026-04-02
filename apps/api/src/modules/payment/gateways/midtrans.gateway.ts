import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentGateway,
  CreateVAParams,
  CreateEwalletParams,
  VirtualAccountResult,
  EwalletResult,
  WebhookResult,
  RefundResult,
} from './payment-gateway.interface';

@Injectable()
export class MidtransGateway implements PaymentGateway {
  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.serverKey = config.get<string>('MIDTRANS_SERVER_KEY', '');
    this.isProduction = config.get<string>('MIDTRANS_IS_PRODUCTION', 'false') === 'true';
    this.baseUrl = this.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
  }

  async createVirtualAccount(params: CreateVAParams): Promise<VirtualAccountResult> {
    const auth = Buffer.from(`${this.serverKey}:`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        payment_type: 'bank_transfer',
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.amountIdr,
        },
        bank_transfer: { bank: params.bankCode.toLowerCase() },
        customer_details: { first_name: params.buyerName, email: params.buyerEmail },
      }),
    });

    const result: any = await response.json();

    return {
      vaNumber: result.va_numbers?.[0]?.va_number || result.permata_va_number || '',
      bankCode: params.bankCode,
      expiresAt: params.expiresAt,
      gatewayRef: result.transaction_id,
    };
  }

  async createEwallet(params: CreateEwalletParams): Promise<EwalletResult> {
    const auth = Buffer.from(`${this.serverKey}:`).toString('base64');

    const methodMap: Record<string, string> = {
      GOPAY: 'gopay',
      OVO: 'ovo',
      DANA: 'dana',
      SHOPEEPAY: 'shopeepay',
    };

    const response = await fetch(`${this.baseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        payment_type: methodMap[params.method] || params.method.toLowerCase(),
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.amountIdr,
        },
        ...(params.returnUrl && {
          gopay: { enable_callback: true, callback_url: params.returnUrl },
        }),
      }),
    });

    const result: any = await response.json();

    return {
      redirectUrl: result.actions?.find((a: any) => a.name === 'generate-qr-code')?.url || '',
      deeplinkUrl: result.actions?.find((a: any) => a.name === 'deeplink-redirect')?.url,
      qrUrl: result.actions?.find((a: any) => a.name === 'generate-qr-code')?.url,
      gatewayRef: result.transaction_id,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    const expected = crypto
      .createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${this.serverKey}`,
      )
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  parseWebhook(payload: any): WebhookResult {
    const statusMap: Record<string, WebhookResult['status']> = {
      settlement: 'SUCCESS',
      capture: 'SUCCESS',
      pending: 'PENDING',
      cancel: 'FAILED',
      expire: 'FAILED',
      deny: 'FAILED',
      failure: 'FAILED',
    };

    return {
      gatewayRef: payload.transaction_id,
      orderId: payload.order_id,
      status: statusMap[payload.transaction_status] || 'FAILED',
      amountIdr: Math.round(parseFloat(payload.gross_amount || '0')),
      paidAt: payload.settlement_time ? new Date(payload.settlement_time) : undefined,
    };
  }

  async processRefund(gatewayRef: string, amountIdr: number, orderId: string): Promise<RefundResult> {
    const auth = Buffer.from(`${this.serverKey}:`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v2/${gatewayRef}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ amount: amountIdr, reason: 'Refund requested' }),
    });

    const result: any = await response.json();
    return {
      refundRef: result.refund_charge_uuid || gatewayRef,
      status: result.refund_status === 'success' ? 'SUCCESS' : 'PENDING',
    };
  }
}
