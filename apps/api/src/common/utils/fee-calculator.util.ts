import { PaymentMethod } from '@prisma/client';

export function calculatePlatformFee(subtotalIdr: number): number {
  return Math.ceil(subtotalIdr * 0.03);
}

export function calculateGatewayFee(method: PaymentMethod, amountIdr: number): number {
  switch (method) {
    case PaymentMethod.BANK_TRANSFER:
      return 4500;
    case PaymentMethod.CREDIT_CARD:
      return Math.min(Math.ceil(amountIdr * 0.019), 200000);
    case PaymentMethod.GOPAY:
    case PaymentMethod.OVO:
    case PaymentMethod.SHOPEEPAY:
      return Math.ceil(amountIdr * 0.02);
    case PaymentMethod.DANA:
      return Math.ceil(amountIdr * 0.015);
    default:
      return 0;
  }
}

export function calculatePaymentTimeout(method: PaymentMethod): number {
  // Returns minutes
  switch (method) {
    case PaymentMethod.BANK_TRANSFER:
      return 60;
    default:
      return 15;
  }
}
