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
  namespace: '/ws/orders',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200' },
})
export class OrderStatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      const orderId = client.handshake.query.orderId as string;

      if (!token || !orderId) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.orderId = orderId;
      client.join(`order:${orderId}`);
    } catch {
      client.emit('ERROR', { type: 'ERROR', code: 'UNAUTHORIZED' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const orderId = client.data.orderId;
    if (orderId) client.leave(`order:${orderId}`);
  }

  pushOrderStatusChanged(orderId: string, payload: Record<string, unknown>) {
    this.server.to(`order:${orderId}`).emit('ORDER_STATUS_CHANGED', {
      type: 'ORDER_STATUS_CHANGED',
      order_id: orderId,
      timestamp: new Date().toISOString(),
      payload,
    });
    // Close connection after terminal states
    const newStatus = (payload as any).new_status;
    if (['PAID', 'EXPIRED', 'CANCELLED'].includes(newStatus)) {
      this.server.in(`order:${orderId}`).disconnectSockets();
    }
  }
}
