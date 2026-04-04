import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'idrCurrency',
  standalone: true,
})
export class IdrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return 'Gratis';
    if (value === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
