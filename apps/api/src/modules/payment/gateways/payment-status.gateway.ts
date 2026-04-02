import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
@WebSocketGateway({
  namespace: '/ws/payments',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200' },
})
export class PaymentStatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      const paymentId = client.handshake.query.paymentId as string;

      if (!token || !paymentId) {
        client.disconnect();
        return;
      }

      this.jwtService.verify(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
      client.data.paymentId = paymentId;
      client.join(`payment:${paymentId}`);
    } catch {
      client.emit('ERROR', { type: 'ERROR', code: 'UNAUTHORIZED' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const paymentId = client.data.paymentId;
    if (paymentId) client.leave(`payment:${paymentId}`);
  }

  pushPaymentStatusChanged(
    paymentId: string,
    orderId: string,
    payload: Record<string, unknown>,
  ) {
    this.server.to(`payment:${paymentId}`).emit('PAYMENT_STATUS_CHANGED', {
      type: 'PAYMENT_STATUS_CHANGED',
      payment_id: paymentId,
      order_id: orderId,
      timestamp: new Date().toISOString(),
      payload,
    });
    const newStatus = (payload as any).new_status;
    if (['PAID', 'FAILED', 'EXPIRED'].includes(newStatus)) {
      this.server.in(`payment:${paymentId}`).disconnectSockets();
    }
  }

  pushPaymentExpired(paymentId: string, eventId: string) {
    this.server.to(`payment:${paymentId}`).emit('PAYMENT_EXPIRED', {
      type: 'PAYMENT_EXPIRED',
      payment_id: paymentId,
      timestamp: new Date().toISOString(),
      payload: {
        message: 'Batas waktu pembayaran telah habis. Silakan ulangi pemesanan.',
        redirect_to: `/events/${eventId}`,
      },
    });
    this.server.in(`payment:${paymentId}`).disconnectSockets();
  }

  pushRefundStatusChanged(refundRequestId: string, payload: Record<string, unknown>) {
    this.server.to(`refund:${refundRequestId}`).emit('REFUND_STATUS_CHANGED', {
      type: 'REFUND_STATUS_CHANGED',
      refund_request_id: refundRequestId,
      timestamp: new Date().toISOString(),
      payload,
    });
    const newStatus = (payload as any).new_status;
    if (['COMPLETED', 'REJECTED'].includes(newStatus)) {
      this.server.in(`refund:${refundRequestId}`).disconnectSockets();
    }
  }
}
