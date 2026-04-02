export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isWithinMinutes(date: Date, minutes: number): boolean {
  const now = new Date();
  const diff = (date.getTime() - now.getTime()) / (1000 * 60);
  return diff >= 0 && diff <= minutes;
}

export function minutesUntil(date: Date): number {
  const now = new Date();
  return (date.getTime() - now.getTime()) / (1000 * 60);
}

export function toISO(date: Date): string {
  return date.toISOString();
}
