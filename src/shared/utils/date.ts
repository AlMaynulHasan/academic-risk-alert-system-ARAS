import { TIMEZONE } from '../constants';

/**
 * Returns current timestamp as an ISO 8601 UTC string.
 */
export function getCurrentUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Formats a UTC ISO timestamp or Date object into human-readable date/time in Asia/Dhaka.
 */
export function formatDhakaDateTime(dateOrIso: string | Date | null | undefined): string {
  if (!dateOrIso) return '—';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a date into YYYY-MM-DD in Asia/Dhaka timezone.
 */
export function formatDhakaDateOnly(dateOrIso: string | Date | null | undefined): string {
  if (!dateOrIso) return '—';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns current month string in Asia/Dhaka as YYYY-MM (for alert counter keys).
 */
export function getCurrentDhakaMonthPeriod(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(now);
  return parts; // 'YYYY-MM'
}
