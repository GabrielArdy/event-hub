import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, OrderSummary, PaymentDetail, PaymentMethod } from '@eventhub/shared-types';
import { environment } from '../../../../../environments/environment';

export interface CreateOrderPayload {
  event_id: string;
  items: { ticket_type_id: string; quantity: number; seat_ids?: string[] }[];
}

export interface InitiatePaymentPayload {
  order_id: string;
  method: PaymentMethod;
  provider?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly TICKETS_BASE = `${environment.apiUrl}/tickets`;
  private readonly PAYMENTS_BASE = `${environment.apiUrl}/payments`;

  createOrder(payload: CreateOrderPayload): Observable<OrderSummary> {
    return this.http
      .post<ApiResponse<OrderSummary>>(`${this.TICKETS_BASE}/orders`, payload)
      .pipe(map((res) => res.data));
  }

  getOrder(orderId: string): Observable<OrderSummary> {
    return this.http
      .get<ApiResponse<OrderSummary>>(`${this.TICKETS_BASE}/orders/${orderId}`)
      .pipe(map((res) => res.data));
  }

  initiatePayment(payload: InitiatePaymentPayload): Observable<PaymentDetail> {
    return this.http
      .post<ApiResponse<PaymentDetail>>(`${this.PAYMENTS_BASE}/initiate`, payload)
      .pipe(map((res) => res.data));
  }

  getPayment(paymentId: string): Observable<PaymentDetail> {
    return this.http
      .get<ApiResponse<PaymentDetail>>(`${this.PAYMENTS_BASE}/${paymentId}`)
      .pipe(map((res) => res.data));
  }
}
