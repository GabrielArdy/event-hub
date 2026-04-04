import { Component, Input } from '@angular/core';
import { IdrCurrencyPipe } from '../../pipes/idr-currency.pipe';

@Component({
  selector: 'app-price-display',
  standalone: true,
  imports: [IdrCurrencyPipe],
  template: `
    <span [style.color]="color" [style.font-weight]="bold ? '700' : '400'" [style.font-size]="size">
      {{ amount | idrCurrency }}
    </span>
  `,
})
export class PriceDisplayComponent {
  @Input() amount: number | null = null;
  @Input() bold = true;
  @Input() color = '#6C63FF';
  @Input() size = '1.125rem';
}
