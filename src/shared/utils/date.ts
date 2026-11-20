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
 * Formats a date or YYYY-MM-DD string into short human-readable date (e.g. "Mar 1" or "Mar 1, 2026") in Asia/Dhaka.
 */
export function formatDhakaShortDate(
  dateOrIso: string | Date | null | undefined,
  includeYear = false
): string {
  if (!dateOrIso) return '—';
  let date: Date;
  if (typeof dateOrIso === 'string') {
    const trimmed = dateOrIso.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      date = new Date(`${trimmed}T12:00:00+06:00`);
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = dateOrIso;
  }
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
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
