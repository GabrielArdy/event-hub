import { Component, Input, OnChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TicketInfo } from '@eventhub/shared-types';

@Component({
  selector: 'app-ticket-qr',
  standalone: true,
  imports: [ButtonModule],
  styles: [
    `
      .qr-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .qr-container {
        position: relative;
        display: inline-block;
      }
      canvas {
        border-radius: 12px;
        display: block;
      }
      .watermark {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(108, 99, 255, 0.75);
        color: #fff;
        font-size: 0.625rem;
        font-weight: 600;
        text-align: center;
        padding: 4px;
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
        pointer-events: none;
      }
      .ticket-info {
        text-align: center;
      }
      .ticket-info h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        margin: 0 0 4px;
      }
      .ticket-info p {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }
    `,
  ],
  template: `
    <div class="qr-wrap">
      <div class="qr-container">
        <canvas #qrCanvas width="200" height="200"></canvas>
        @if (holderName) {
          <div class="watermark">{{ holderName }}</div>
        }
      </div>

      <div class="ticket-info">
        <h3>{{ ticket?.event?.title }}</h3>
        <p>{{ ticket?.ticket_type }}</p>
        @if (ticket?.seat) {
          <p>Kursi: {{ ticket?.seat }}</p>
        }
      </div>

      @if (ticket?.pdf_url) {
        <a [href]="ticket?.pdf_url" target="_blank" download>
          <button
            pButton
            type="button"
            label="Download PDF"
            icon="pi pi-download"
            severity="secondary"
            outlined
          ></button>
        </a>
      }
    </div>
  `,
})
export class TicketQrComponent implements OnChanges, AfterViewInit {
  @Input() ticket: TicketInfo | null = null;
  @Input() holderName = '';
  @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private viewInitialized = false;

  ngAfterViewInit() {
    this.viewInitialized = true;
    this.renderQr();
  }

  ngOnChanges() {
    if (this.viewInitialized) {
      this.renderQr();
    }
  }

  private renderQr() {
    if (!this.canvasRef || !this.ticket?.qr_token) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw QR placeholder (actual QR rendering requires qrcode library)
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#6C63FF';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR CODE', 100, 100);
    ctx.fillStyle = '#6B7280';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText(this.ticket.qr_token.slice(0, 16) + '...', 100, 120);
  }
}
