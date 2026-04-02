export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculatePlatformFee(subtotalIdr: number): number {
  return Math.ceil(subtotalIdr * 0.03);
}

export const GATEWAY_FEES: Record<string, number | ((amount: number) => number)> = {
  BANK_TRANSFER: 4500,
  CREDIT_CARD: (amount: number) => Math.min(Math.ceil(amount * 0.019), 200000),
  GOPAY: (amount: number) => Math.ceil(amount * 0.02),
  OVO: (amount: number) => Math.ceil(amount * 0.02),
  DANA: (amount: number) => Math.ceil(amount * 0.015),
  SHOPEEPAY: (amount: number) => Math.ceil(amount * 0.02),
};

export function calculateGatewayFee(method: string, amountIdr: number): number {
  const fee = GATEWAY_FEES[method];
  if (!fee) return 0;
  return typeof fee === 'function' ? fee(amountIdr) : fee;
}
