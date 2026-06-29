import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;

  private getBackendUrl(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return `${window.location.protocol}//${window.location.host}`;
  }

  private backendUrl = this.getBackendUrl();
  private authService = inject(AuthService);

  // Subjects for reactive updates
  private ticketCreated$ = new Subject<any>();
  private ticketUpdated$ = new Subject<any>();
  private commentAdded$ = new Subject<any>();
  private notificationReceived$ = new Subject<any>();
  private chatMessage$ = new Subject<any>();
  private dmMessage$ = new Subject<any>();

  constructor() {
    this.initSocket();

    // Re-authenticate socket when user logs in/out
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.socket.emit('join_user', user._id);
      } else {
        if (this.socket && this.socket.connected) {
          this.socket.disconnect();
          this.initSocket();
        }
      }
    });
  }

  private initSocket() {
    this.socket = io(this.backendUrl, {
      autoConnect: true,
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connection established with backend.');
      const user = this.authService.currentUserValue;
      if (user) {
        this.socket.emit('join_user', user._id);
      }
    });

    // Wire up events to RxJS subjects
    this.socket.on('ticket_created', (ticket) => this.ticketCreated$.next(ticket));
    this.socket.on('ticket_updated', (ticket) => this.ticketUpdated$.next(ticket));
    this.socket.on('comment_added', (commentData) => this.commentAdded$.next(commentData));
    this.socket.on('notification_received', (notif) => this.notificationReceived$.next(notif));
    this.socket.on('new_message', (msg) => this.chatMessage$.next(msg));
    this.socket.on('new_dm', (dm) => this.dmMessage$.next(dm));

    this.socket.on('disconnect', () => {
      console.log('Socket.IO disconnected.');
    });
  }

  // Observable getters for features to consume
  get onTicketCreated(): Observable<any> {
    return this.ticketCreated$.asObservable();
  }

  get onTicketUpdated(): Observable<any> {
    return this.ticketUpdated$.asObservable();
  }

  get onCommentAdded(): Observable<any> {
    return this.commentAdded$.asObservable();
  }

  get onNotificationReceived(): Observable<any> {
    return this.notificationReceived$.asObservable();
  }

  get onChatMessage(): Observable<any> {
    return this.chatMessage$.asObservable();
  }

  get onDmMessage(): Observable<any> {
    return this.dmMessage$.asObservable();
  }

  // Room operations
  joinTicket(ticketId: string) {
    this.socket.emit('join_ticket', ticketId);
  }

  leaveTicket(ticketId: string) {
    this.socket.emit('leave_ticket', ticketId);
  }

  emitComment(ticketId: string, comment: any) {
    this.socket.emit('new_comment_posted', { ticketId, comment });
  }

  joinChannel(channelId: string) {
    this.socket.emit('join_room', `channel_${channelId}`);
  }

  leaveChannel(channelId: string) {
    this.socket.emit('leave_room', `channel_${channelId}`);
  }
}
