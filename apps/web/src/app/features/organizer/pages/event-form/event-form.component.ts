import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { StepsModule } from 'primeng/steps';
import { MessageModule } from 'primeng/message';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { OrganizerStore } from '../../store/organizer.store';
import { OrganizerApiService } from '../../services/organizer-api.service';
import { IdrCurrencyPipe } from '../../../../shared/pipes/idr-currency.pipe';
import { calculatePlatformFee } from '@eventhub/shared-utils';

const CATEGORIES = [
  { label: 'Musik', value: 'MUSIC' },
  { label: 'Seminar', value: 'SEMINAR' },
  { label: 'Olahraga', value: 'SPORT' },
  { label: 'Pameran', value: 'EXHIBITION' },
  { label: 'Komedi', value: 'COMEDY' },
  { label: 'Lainnya', value: 'OTHER' },
];

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink,
    ButtonModule, InputTextModule, InputNumberModule, RadioButtonModule, DropdownModule,
    CalendarModule, StepsModule, MessageModule, InputTextareaModule,
    DatePipe, IdrCurrencyPipe,
  ],
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 24px; }
    .step-content { background: #fff; border-radius: 16px; padding: 24px; margin-top: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    label { font-size: 0.875rem; font-weight: 500; color: #374151; }
    .error-text { font-size: 0.75rem; color: #EF4444; }
    .venue-toggle { display: flex; gap: 16px; margin-bottom: 8px; }
    .venue-option { flex: 1; padding: 14px; border: 2px solid #E5E7EB; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
    .venue-option.selected { border-color: #6C63FF; background: #EDE9FE; }
    .ticket-type-card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 12px; position: relative; }
    .auto-save { font-size: 0.75rem; color: #6B7280; text-align: right; margin-bottom: 8px; }
    .step-nav { display: flex; justify-content: space-between; margin-top: 24px; }
    .review-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6; font-size: 0.875rem; }
    .review-label { color: #6B7280; }
    .review-value { font-weight: 600; color: #111827; }
  `],
  template: `
    <div class="page">
      <h1 class="page-title">{{ isEditMode ? 'Edit Event' : 'Buat Event Baru' }}</h1>

      <p-steps [model]="stepItems" [activeIndex]="currentStep()" [readonly]="true" />

      @if (orgStore.publishSuccess()) {
        <p-message severity="success" text="Event berhasil dipublikasi! Kamu akan diarahkan ke daftar event..." styleClass="w-full mt-4" />
      }

      @if (orgStore.error()) {
        <p-message severity="error" [text]="errorMessage()" styleClass="w-full mt-4" />
      }

      @if (autoSaveLabel()) {
        <div class="auto-save">💾 {{ autoSaveLabel() }}</div>
      }

      <div class="step-content">
        @switch (currentStep()) {
          @case (0) {
            <!-- STEP 1: Info Dasar -->
            <form [formGroup]="step1Form">
              <div class="field">
                <label>Judul Acara *</label>
                <input pInputText formControlName="title" placeholder="Nama acara kamu" style="width: 100%" />
                @if (step1Form.get('title')?.invalid && step1Form.get('title')?.touched) {
                  <span class="error-text">Judul wajib diisi</span>
                }
              </div>

              <div class="field">
                <label>Kategori *</label>
                <p-dropdown [options]="categories" optionLabel="label" optionValue="value"
                  formControlName="category" placeholder="Pilih kategori" styleClass="w-full" />
              </div>

              <div class="field">
                <label>Deskripsi *</label>
                <textarea pInputTextarea formControlName="description" rows="6"
                  placeholder="Ceritakan tentang acara kamu..." style="width: 100%"></textarea>
                @if (step1Form.get('description')?.invalid && step1Form.get('description')?.touched) {
                  <span class="error-text">Deskripsi minimal 50 karakter</span>
                }
              </div>

              <div class="field">
                <label>Banner URL (16:9, maks 5MB)</label>
                <input pInputText formControlName="bannerUrl" placeholder="https://..." style="width: 100%" />
              </div>
            </form>
          }

          @case (1) {
            <!-- STEP 2: Venue & Jadwal -->
            <form [formGroup]="step2Form">
              <div class="field">
                <label>Tipe Venue *</label>
                <div class="venue-toggle">
                  <div class="venue-option" [class.selected]="step2Form.get('venueType')?.value === 'PHYSICAL'"
                    (click)="step2Form.get('venueType')?.setValue('PHYSICAL')">
                    <p-radioButton formControlName="venueType" value="PHYSICAL" />
                    <div>
                      <div style="font-weight: 600; font-size: 0.875rem;">Fisik</div>
                      <div style="font-size: 0.75rem; color: #6B7280;">Venue offline</div>
                    </div>
                  </div>
                  <div class="venue-option" [class.selected]="step2Form.get('venueType')?.value === 'ONLINE'"
                    (click)="step2Form.get('venueType')?.setValue('ONLINE')">
                    <p-radioButton formControlName="venueType" value="ONLINE" />
                    <div>
                      <div style="font-weight: 600; font-size: 0.875rem;">Online</div>
                      <div style="font-size: 0.75rem; color: #6B7280;">Live streaming</div>
                    </div>
                  </div>
                </div>
              </div>

              @if (step2Form.get('venueType')?.value === 'PHYSICAL') {
                <div class="field">
                  <label>Nama Venue *</label>
                  <input pInputText formControlName="venueName" placeholder="GBK, Istora, dll." style="width: 100%" />
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div class="field">
                    <label>Kota *</label>
                    <input pInputText formControlName="venueCity" placeholder="Jakarta" style="width: 100%" />
                  </div>
                  <div class="field">
                    <label>Kapasitas *</label>
                    <p-inputNumber formControlName="maxCapacity" [min]="1" placeholder="1000" styleClass="w-full" />
                  </div>
                </div>
                <div class="field">
                  <label>Alamat Lengkap *</label>
                  <input pInputText formControlName="venueAddress" placeholder="Jl. ..." style="width: 100%" />
                </div>
              } @else {
                <div class="field">
                  <label>Link Streaming *</label>
                  <input pInputText formControlName="onlineUrl" placeholder="https://zoom.us/j/..." style="width: 100%" />
                </div>
              }

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="field">
                  <label>Tanggal & Waktu Mulai *</label>
                  <p-calendar formControlName="startAt" [showTime]="true" hourFormat="24" dateFormat="dd/mm/yy"
                    placeholder="Pilih tanggal & waktu" styleClass="w-full" />
                </div>
                <div class="field">
                  <label>Tanggal & Waktu Selesai *</label>
                  <p-calendar formControlName="endAt" [showTime]="true" hourFormat="24" dateFormat="dd/mm/yy"
                    placeholder="Pilih tanggal & waktu" styleClass="w-full" />
                </div>
              </div>
            </form>
          }

          @case (2) {
            <!-- STEP 3: Tipe Tiket -->
            @for (ticketGroup of ticketTypes.controls; track $index; let i = $index) {
              <div class="ticket-type-card" [formGroup]="$any(ticketGroup)">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <div style="font-weight: 700; color: #111827;">Tipe Tiket {{ i + 1 }}</div>
                  @if (ticketTypes.length > 1) {
                    <button pButton type="button" icon="pi pi-trash" size="small" severity="danger" text
                      (click)="removeTicketType(i)"></button>
                  }
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div class="field">
                    <label>Nama *</label>
                    <input pInputText formControlName="name" placeholder="Regular, VIP, dll." style="width: 100%" />
                  </div>
                  <div class="field">
                    <label>Harga (Rp) *</label>
                    <p-inputNumber formControlName="priceIdr" [min]="0" placeholder="150000" styleClass="w-full" />
                  </div>
                  <div class="field">
                    <label>Kuota *</label>
                    <p-inputNumber formControlName="quota" [min]="1" placeholder="500" styleClass="w-full" />
                  </div>
                  <div class="field">
                    <label>Maks per orang *</label>
                    <p-inputNumber formControlName="maxPerUser" [min]="1" [max]="10" placeholder="5" styleClass="w-full" />
                  </div>
                </div>
              </div>
            }

            <button pButton type="button" label="+ Tambah Tipe Tiket" icon="pi pi-plus"
              outlined (click)="addTicketType()"
              style="border-radius: 9999px; margin-top: 8px;"></button>

            @if (totalQuotaWarning()) {
              <p-message severity="warn" [text]="totalQuotaWarning()!" styleClass="w-full mt-3" />
            }
          }

          @case (3) {
            <!-- STEP 4: Review & Publish -->
            <div style="margin-bottom: 24px;">
              <div style="font-size: 1rem; font-weight: 700; color: #111827; margin-bottom: 16px;">Preview Event</div>

              <div class="review-row">
                <span class="review-label">Judul</span>
                <span class="review-value">{{ step1Form.get('title')?.value }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Kategori</span>
                <span class="review-value">{{ step1Form.get('category')?.value }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Tipe Venue</span>
                <span class="review-value">{{ step2Form.get('venueType')?.value === 'PHYSICAL' ? 'Fisik' : 'Online' }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Lokasi</span>
                <span class="review-value">{{ step2Form.get('venueName')?.value || step2Form.get('onlineUrl')?.value }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Tanggal</span>
                <span class="review-value">{{ step2Form.get('startAt')?.value | date:'d MMM yyyy, HH:mm' }}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Jumlah Tipe Tiket</span>
                <span class="review-value">{{ ticketTypes.length }} tipe</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button pButton type="button" label="Simpan sebagai Draft"
                [loading]="orgStore.isSaving()" (click)="saveDraft()"
                outlined style="border-radius: 9999px; flex: 1;"></button>
              <button pButton type="button" label="Publikasikan Sekarang 🚀"
                [loading]="orgStore.isSaving()" (click)="publish()"
                [disabled]="!draftEventId()"
                style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF; flex: 1;"></button>
            </div>
          }
        }

        <!-- Navigation -->
        @if (currentStep() < 3) {
          <div class="step-nav">
            @if (currentStep() > 0) {
              <button pButton type="button" label="← Sebelumnya" outlined (click)="prevStep()" style="border-radius: 9999px;"></button>
            } @else {
              <div></div>
            }
            <button pButton type="button" [label]="currentStep() === 2 ? 'Lanjut ke Review →' : 'Lanjut →'"
              (click)="nextStep()"
              [disabled]="!isCurrentStepValid()"
              style="border-radius: 9999px; background: #6C63FF; border-color: #6C63FF;"></button>
          </div>
        }
      </div>
    </div>
  `,
})
export class EventFormComponent implements OnInit, OnDestroy {
  readonly orgStore = inject(OrganizerStore);
  private readonly orgApi = inject(OrganizerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  isEditMode = false;
  editEventId: string | null = null;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  readonly categories = CATEGORIES;
  readonly stepItems = [
    { label: 'Info Dasar' },
    { label: 'Venue & Jadwal' },
    { label: 'Tiket' },
    { label: 'Review' },
  ];

  readonly autoSaveLabel = signal<string | null>(null);

  readonly currentStep = computed(() => this.orgStore.currentStep());
  readonly draftEventId = computed(() => this.orgStore.draftEventId());

  readonly errorMessage = computed(() => {
    const code = this.orgStore.error();
    if (code === 'EVENT_NOT_MODIFIABLE') return 'Event tidak bisa diubah (kurang dari 6 jam sebelum acara).';
    if (code === 'QUOTA_EXCEEDS_CAPACITY') return 'Total kuota melebihi kapasitas venue + 5%.';
    return 'Terjadi kesalahan. Coba lagi.';
  });

  readonly step1Form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    category: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(50)]],
    bannerUrl: [''],
  });

  readonly step2Form = this.fb.group({
    venueType: ['PHYSICAL', Validators.required],
    venueName: [''],
    venueCity: [''],
    venueAddress: [''],
    maxCapacity: [null as number | null],
    onlineUrl: [''],
    startAt: [null as Date | null, Validators.required],
    endAt: [null as Date | null, Validators.required],
  });

  readonly ticketTypes = this.fb.array([this.createTicketTypeGroup()]);

  readonly totalQuotaWarning = computed(() => {
    const cap = this.step2Form.get('maxCapacity')?.value as number;
    if (!cap) return null;
    const total = this.ticketTypes.controls.reduce(
      (sum, ctrl) => sum + ((ctrl.get('quota')?.value as number) ?? 0),
      0,
    );
    const max = Math.ceil(cap * 1.05);
    if (total > max) return `Total kuota (${total}) melebihi kapasitas venue + 5% (${max}).`;
    return null;
  });

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('event_id');
    if (eventId) {
      this.isEditMode = true;
      this.editEventId = eventId;
      this.orgStore.loadEventDetail(eventId);
    }
    this.orgStore.setStep(0);

    // Auto-save every 2 minutes (BR-ORG-006)
    this.autoSaveInterval = setInterval(() => this.autoSave(), 120_000);
  }

  ngOnDestroy() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
  }

  createTicketTypeGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      priceIdr: [0, [Validators.required, Validators.min(0)]],
      quota: [100, [Validators.required, Validators.min(1)]],
      maxPerUser: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    });
  }

  addTicketType() { this.ticketTypes.push(this.createTicketTypeGroup()); }
  removeTicketType(i: number) { if (this.ticketTypes.length > 1) this.ticketTypes.removeAt(i); }

  isCurrentStepValid(): boolean {
    if (this.currentStep() === 0) return this.step1Form.valid;
    if (this.currentStep() === 1) return this.step2Form.valid;
    if (this.currentStep() === 2) return this.ticketTypes.valid;
    return true;
  }

  nextStep() {
    if (!this.isCurrentStepValid()) {
      this.step1Form.markAllAsTouched();
      this.step2Form.markAllAsTouched();
      return;
    }
    if (this.currentStep() === 0) {
      this.saveStep1();
    } else {
      this.orgStore.setStep(this.currentStep() + 1);
    }
  }

  prevStep() { this.orgStore.setStep(Math.max(0, this.currentStep() - 1)); }

  private buildPayload() {
    const s1 = this.step1Form.value;
    const s2 = this.step2Form.value;
    return {
      title: s1.title!,
      category: s1.category!,
      description: s1.description!,
      banner_url: s1.bannerUrl || undefined,
      venue_type: s2.venueType as 'PHYSICAL' | 'ONLINE',
      venue_name: s2.venueName || undefined,
      venue_city: s2.venueCity || undefined,
      venue_address: s2.venueAddress || undefined,
      max_capacity: s2.maxCapacity || undefined,
      online_url: s2.onlineUrl || undefined,
      start_at: s2.startAt?.toISOString() ?? '',
      end_at: s2.endAt?.toISOString() ?? '',
    };
  }

  private saveStep1() {
    const payload = this.buildPayload();
    if (this.draftEventId()) {
      this.orgStore.updateEvent({ eventId: this.draftEventId()!, payload });
    } else {
      this.orgStore.createEvent(payload);
    }
    this.orgStore.setStep(1);
  }

  autoSave() {
    const eventId = this.draftEventId();
    if (!eventId || this.currentStep() === 3) return;
    this.orgStore.updateEvent({ eventId, payload: this.buildPayload() });
    this.autoSaveLabel.set('Tersimpan otomatis ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }

  saveDraft() {
    const eventId = this.draftEventId();
    if (!eventId) return;
    this.orgStore.updateEvent({ eventId, payload: this.buildPayload() });
  }

  publish() {
    const eventId = this.draftEventId();
    if (!eventId) return;
    this.orgStore.publishEvent(eventId);
  }
}
