import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { SeatMapData, SeatInfo } from '@eventhub/shared-types';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  styles: [
    `
      .seat-map {
        background: #f9fafb;
        border-radius: 12px;
        padding: 16px;
        overflow-x: auto;
      }
      .stage {
        text-align: center;
        background: #6c63ff;
        color: #fff;
        border-radius: 8px;
        padding: 8px 24px;
        margin: 0 auto 24px;
        width: fit-content;
        font-weight: 600;
        font-size: 0.875rem;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
        justify-content: center;
      }
      .row-label {
        width: 24px;
        text-align: center;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
      }
      .seat {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 0.625rem;
        font-weight: 600;
        transition: transform 0.1s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .seat:hover:not(:disabled) {
        transform: scale(1.1);
      }
      .seat.available {
        background: #d1d5db;
        color: #374151;
      }
      .seat.selected {
        background: #6c63ff;
        color: #fff;
      }
      .seat.locked {
        background: #f97316;
        color: #fff;
        cursor: not-allowed;
      }
      .seat.sold {
        background: #ef4444;
        color: #fff;
        cursor: not-allowed;
      }
      .seat.unavailable {
        background: #e5e7eb;
        color: #9ca3af;
        cursor: not-allowed;
      }
      .legend {
        display: flex;
        gap: 16px;
        margin-top: 16px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        color: #6b7280;
      }
      .legend-dot {
        width: 14px;
        height: 14px;
        border-radius: 4px;
      }
    `,
  ],
  template: `
    <div class="seat-map">
      <div class="stage">PANGGUNG</div>

      @for (row of seatMapData?.rows ?? []; track row.row_label) {
        <div class="row">
          <span class="row-label">{{ row.row_label }}</span>
          @for (seat of row.seats; track seat.seat_number) {
            <button
              type="button"
              class="seat"
              [class.available]="seat.status === 'AVAILABLE' && !isSelected(seat)"
              [class.selected]="isSelected(seat)"
              [class.locked]="seat.status === 'LOCKED' && !isSelected(seat)"
              [class.sold]="seat.status === 'SOLD'"
              [class.unavailable]="seat.status === 'UNAVAILABLE'"
              [disabled]="
                seat.status === 'SOLD' || seat.status === 'LOCKED' || seat.status === 'UNAVAILABLE'
              "
              [title]="seat.seat_number + ' - ' + seat.status"
              (click)="toggleSeat(seat)"
            >
              {{ seat.seat_number.slice(-2) }}
            </button>
          }
        </div>
      }

      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot" style="background:#D1D5DB"></div>
          Tersedia
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:#6C63FF"></div>
          Dipilih
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:#F97316"></div>
          Terkunci
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:#EF4444"></div>
          Terjual
        </div>
      </div>
    </div>
  `,
})
export class SeatMapComponent implements OnChanges {
  @Input() seatMapData: SeatMapData | null = null;
  @Input() selectedSeats: string[] = [];
  @Input() maxSelectable = 5;
  @Output() seatsChanged = new EventEmitter<string[]>();

  private _selected = new Set<string>();

  ngOnChanges() {
    this._selected = new Set(this.selectedSeats);
  }

  isSelected(seat: SeatInfo): boolean {
    return this._selected.has(seat.seat_number);
  }

  toggleSeat(seat: SeatInfo) {
    if (seat.status !== 'AVAILABLE') return;
    if (this._selected.has(seat.seat_number)) {
      this._selected.delete(seat.seat_number);
    } else {
      if (this._selected.size >= this.maxSelectable) return;
      this._selected.add(seat.seat_number);
    }
    this.seatsChanged.emit([...this._selected]);
  }
}
