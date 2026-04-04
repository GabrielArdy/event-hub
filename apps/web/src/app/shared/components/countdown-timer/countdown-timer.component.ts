import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  template: `
    <span
      [style.color]="isWarning() ? '#EF4444' : '#111827'"
      [style.font-weight]="'700'"
      [style.font-size]="'1.5rem'"
      [class.animate-pulse]="isWarning()"
    >
      {{ label() }}
    </span>
  `,
})
export class CountdownTimerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) expiresAt!: string;
  @Input() warningAt = 300; // seconds before expiry to turn red
  @Output() expired = new EventEmitter<void>();

  private intervalId: ReturnType<typeof setInterval> | null = null;
  readonly remaining = signal(0);

  readonly isWarning = computed(() => this.remaining() <= this.warningAt && this.remaining() > 0);

  readonly label = computed(() => {
    const secs = this.remaining();
    if (secs <= 0) return '00:00';
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  ngOnInit() {
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private tick() {
    const now = Date.now();
    const exp = new Date(this.expiresAt).getTime();
    const diff = Math.max(0, Math.floor((exp - now) / 1000));
    this.remaining.set(diff);
    if (diff === 0) {
      if (this.intervalId) clearInterval(this.intervalId);
      this.expired.emit();
    }
  }
}
