import { format, formatDistance, isPast, addDays, differenceInDays, parseISO } from 'date-fns';

export class DateHelpers {
  /**
   * Format a date for display
   */
  formatDate(date: Date | string, formatStr: string = 'PPP'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  }

  /**
   * Get relative time (e.g., "2 days ago")
   */
  getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  }

  /**
   * Check if date is in the past
   */
  isPast(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isPast(dateObj);
  }

  /**
   * Add days to a date
   */
  addDays(date: Date, days: number): Date {
    return addDays(date, days);
  }

  /**
   * Get days between two dates
   */
  daysBetween(date1: Date | string, date2: Date | string): number {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return differenceInDays(d2, d1);
  }

  /**
   * Get next occurrence of an annual date (MM-DD format)
   */
  getNextOccurrence(dateString: string): Date {
    const [month, day] = dateString.split('-').map(Number);
    const currentYear = new Date().getFullYear();
    const thisYear = new Date(currentYear, month - 1, day);

    if (isPast(thisYear)) {
      return new Date(currentYear + 1, month - 1, day);
    }
    return thisYear;
  }

  /**
   * Format date as MM-DD for storage
   */
  toMMDD(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  /**
   * Get days until a date
   */
  daysUntil(date: Date | string): number {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return differenceInDays(dateObj, new Date());
  }

  /**
   * Check if a date is within N days from now
   */
  isWithinDays(date: Date | string, days: number): boolean {
    const daysUntil = this.daysUntil(date);
    return daysUntil >= 0 && daysUntil <= days;
  }
}

export const dateHelpers = new DateHelpers();
