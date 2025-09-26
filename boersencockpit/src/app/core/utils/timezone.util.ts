import { inject } from '@angular/core';

import { APP_TIMEZONE } from '../tokens/timezone.token';

/**
 * Formats a date in the application timezone. Placeholder that will be refined in later phases.
 */
export function formatInAppTimezone(date: Date | string): string {
  const timezone = inject(APP_TIMEZONE);
  const normalizedDate = typeof date === 'string' ? new Date(date) : date;
  return `${normalizedDate.toISOString()} (${timezone})`;
}
