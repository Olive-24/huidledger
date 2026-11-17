// Formatting helpers — always use these, never scatter Intl calls across components.

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Format a Date as "17 Nov 2026, 10:30 PM" (Asia/Kolkata). */
export function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date).replace(",", "");
}

/** Format a Date as "17 Nov 2026" (date-only). */
export function formatDateOnly(date: Date): string {
  return DATE_ONLY_FORMATTER.format(date);
}

const MONEY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Format a number as INR, e.g. ₹1,500 */
export function formatMoney(amount: number): string {
  return MONEY_FORMATTER.format(amount);
}

/** Format weight, e.g. "12.500 g" */
export function formatWeight(grams: number): string {
  return `${grams.toFixed(3)} g`;
}

/** Format milliseconds as "3d 5h" or "12h" */
export function formatMs(ms: number): string {
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours}h`;
  if (hours === 0) return `${days}d`;
  return `${days}d ${hours}h`;
}
