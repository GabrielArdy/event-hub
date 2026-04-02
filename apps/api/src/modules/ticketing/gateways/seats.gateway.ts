import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  namespace: '/ws/seats',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200' },
})
export class SeatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const eventId = client.handshake.query.eventId as string;
    if (!eventId) {
      client.disconnect();
      return;
    }
    client.data.eventId = eventId;
    client.join(`seats:event:${eventId}`);
  }

  handleDisconnect(client: Socket) {
    const eventId = client.data.eventId;
    if (eventId) client.leave(`seats:event:${eventId}`);
  }

  pushSeatLocked(
    eventId: string,
    payload: { seats: string[]; lockedUntil: Date },
    ownerSocketId?: string,
  ) {
    this.server.to(`seats:event:${eventId}`).emit('SEAT_LOCKED', {
      type: 'SEAT_LOCKED',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload: {
        seats: payload.seats,
        locked_until: payload.lockedUntil.toISOString(),
        is_mine: false,
      },
    });

    if (ownerSocketId) {
      this.server.to(ownerSocketId).emit('SEAT_LOCKED', {
        type: 'SEAT_LOCKED',
        event_id: eventId,
        timestamp: new Date().toISOString(),
        payload: {
          seats: payload.seats,
          locked_until: payload.lockedUntil.toISOString(),
          is_mine: true,
        },
      });
    }
  }

  pushSeatReleased(
    eventId: string,
    seats: string[],
    reason: 'TIMEOUT' | 'USER_CANCELLED' | 'PAYMENT_FAILED',
  ) {
    this.server.to(`seats:event:${eventId}`).emit('SEAT_RELEASED', {
      type: 'SEAT_RELEASED',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload: { seats, reason },
    });
  }

  pushSeatSold(eventId: string, seats: string[]) {
    this.server.to(`seats:event:${eventId}`).emit('SEAT_SOLD', {
      type: 'SEAT_SOLD',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload: { seats },
    });
  }

  pushZoneUpdate(eventId: string, zones: any[]) {
    this.server.to(`seats:event:${eventId}`).emit('ZONE_UPDATE', {
      type: 'ZONE_UPDATE',
      event_id: eventId,
      timestamp: new Date().toISOString(),
      payload: { zones },
    });
  }
}
