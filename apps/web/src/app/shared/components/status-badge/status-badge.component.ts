import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

type AnyStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'ACTIVE'
  | 'USED'
  | 'WAITING_PAYMENT'
  | 'FAILED';

const STATUS_CONFIG: Record<AnyStatus, { label: string; severity: 'success' | 'info' | 'warning' | 'danger' | undefined }> = {
  DRAFT:           { label: 'Draft',            severity: undefined },
  PUBLISHED:       { label: 'Dipublikasi',       severity: 'info' },
  ONGOING:         { label: 'Berlangsung',       severity: 'success' },
  COMPLETED:       { label: 'Selesai',           severity: 'success' },
  CANCELLED:       { label: 'Dibatalkan',        severity: 'danger' },
  POSTPONED:       { label: 'Ditunda',           severity: 'warning' },
  PENDING_PAYMENT: { label: 'Menunggu Bayar',    severity: 'warning' },
  WAITING_PAYMENT: { label: 'Menunggu Bayar',    severity: 'warning' },
  PAID:            { label: 'Lunas',             severity: 'success' },
  EXPIRED:         { label: 'Kadaluarsa',        severity: 'danger' },
  REFUNDED:        { label: 'Direfund',          severity: undefined },
  ACTIVE:          { label: 'Aktif',             severity: 'success' },
  USED:            { label: 'Sudah Dipakai',     severity: 'info' },
  FAILED:          { label: 'Gagal',             severity: 'danger' },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TagModule],
  template: `
    <p-tag
      [value]="config.label"
      [severity]="config.severity"
      [rounded]="true"
    />
  `,
})
export class StatusBadgeComponent {
  @Input() status: AnyStatus = 'DRAFT';

  get config() {
    return STATUS_CONFIG[this.status] ?? { label: this.status, severity: undefined };
  }
}
