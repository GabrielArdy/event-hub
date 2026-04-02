import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  namespace: '/ws/organizer',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200' },
})
export class OrganizerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      const eventId = client.handshake.query.eventId as string;

      if (!token || !eventId) {
        client.emit('ERROR', { type: 'ERROR', code: 'UNAUTHORIZED', message: 'Token diperlukan' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      // Validate organizer owns the event — done in service layer
      client.data.userId = payload.sub;
      client.data.eventId = eventId;
      client.join(`organizer:event:${eventId}`);

      client.emit('CONNECTED', {
        type: 'CONNECTED',
        event_id: eventId,
        timestamp: new Date().toISOString(),
        payload: { message: 'Connected to organizer dashboard' },
      });
    } catch {
      client.emit('ERROR', { type: 'ERROR', code: 'UNAUTHORIZED', message: 'Token tidak valid' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const eventId = client.data.eventId;
    if (eventId) client.leave(`organizer:event:${eventId}`);
  }

  pushTicketSold(eventId: string, payload: Record<string, unknown>) {
    this.server.to(`organizer:event:${eventId}`).emit('TICKET_SOLD', {
      type: 'TICKET_SOLD',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  pushCheckinUpdate(eventId: string, payload: Record<string, unknown>) {
    this.server.to(`organizer:event:${eventId}`).emit('CHECKIN_UPDATE', {
      type: 'CHECKIN_UPDATE',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  pushEventStatusChanged(eventId: string, oldStatus: string, newStatus: string) {
    this.server.to(`organizer:event:${eventId}`).emit('EVENT_STATUS_CHANGED', {
      type: 'EVENT_STATUS_CHANGED',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload: { old_status: oldStatus, new_status: newStatus },
    });
  }

  pushCapacityWarning(eventId: string, payload: Record<string, unknown>) {
    this.server.to(`organizer:event:${eventId}`).emit('CAPACITY_WARNING', {
      type: 'CAPACITY_WARNING',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload,
    });
  }
}
