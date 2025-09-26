import { InjectionToken } from '@angular/core';

/** Token that exposes the application-wide timezone identifier. */
export const APP_TIMEZONE = new InjectionToken<string>('APP_TIMEZONE');
