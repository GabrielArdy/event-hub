import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

// TODO: Implement full WebSocket service with reconnection strategy per spec

@Injectable({ providedIn: 'root' })
export class WsService {
  private sockets = new Map<string, Socket>();

  connect(namespace: string, token?: string, query?: Record<string, string>): Socket {
    const key = `${namespace}:${JSON.stringify(query)}`;
    if (this.sockets.has(key)) return this.sockets.get(key)!;

    const socket = io(`${environment.wsUrl}${namespace}`, {
      query: { ...(token ? { token } : {}), ...query },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    this.sockets.set(key, socket);
    return socket;
  }

  on<T>(namespace: string, event: string, query?: Record<string, string>): Observable<T> {
    const socket = this.sockets.get(`${namespace}:${JSON.stringify(query)}`);
    if (!socket) throw new Error(`Socket ${namespace} belum terkoneksi`);

    return new Observable((observer) => {
      socket.on(event, (data: T) => observer.next(data));
      return () => socket.off(event);
    });
  }

  disconnect(namespace: string, query?: Record<string, string>) {
    const key = `${namespace}:${JSON.stringify(query)}`;
    this.sockets.get(key)?.disconnect();
    this.sockets.delete(key);
  }
}
