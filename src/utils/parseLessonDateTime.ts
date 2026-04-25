/**
 * @fileoverview Lesson Date/Time Parser Utility
 * @description Centralized utility for parsing lesson date and time into Date objects
 * @author Ridesk Team
 * @version 1.0.0
 */

/**
 * Interface for lesson objects that have date and time properties
 */
export interface LessonWithDateTime {
  date: string; // Expected format: YYYY-MM-DD (ISO date string)
  time?: string; // Expected format: HH:mm:ss or HH:mm (time string)
}

export function parseLessonDateTime(lesson: LessonWithDateTime): Date | null {
  if (!lesson.date) {
    return null;
  }

  try {
    const dateParts = lesson.date.split('-');
    if (dateParts.length !== 3) {
      console.warn(`Invalid date format: ${lesson.date}. Expected YYYY-MM-DD`);
      return null;
    }

    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateParts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn(`Invalid date values: ${lesson.date}`);
      return null;
    }

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (lesson.time) {
      const timeStr = lesson.time.trim();
      const timeParts = timeStr.split(':').map(part => parseInt(part, 10));

      if (timeParts.length >= 2 && !timeParts.some(isNaN)) {
        hours = timeParts[0];
        minutes = timeParts[1];
        seconds = timeParts[2] || 0; // Default to 0 if seconds not provided
      } else {
        console.warn(`Invalid time format: ${lesson.time}. Expected HH:mm:ss or HH:mm`);
      }
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      console.warn(`Invalid time values: ${lesson.time}`);
      return null;
    }

    const dateTime = new Date(year, month, day, hours, minutes, seconds);

    if (isNaN(dateTime.getTime())) {
      console.warn(`Invalid date/time combination: ${lesson.date} ${lesson.time}`);
      return null;
    }

    if (
      dateTime.getFullYear() !== year ||
      dateTime.getMonth() !== month ||
      dateTime.getDate() !== day
    ) {
      console.warn(`Invalid calendar date: ${lesson.date} (normalized to ${dateTime.getFullYear()}-${dateTime.getMonth() + 1}-${dateTime.getDate()})`);
      return null;
    }

    return dateTime;
  } catch (error) {
    console.error(`Error parsing lesson date/time:`, error);
    return null;
  }
}

/**
 * @param date - Date string to validate
 * @param time - Optional time string to validate
 * @returns true if format is valid, false otherwise
 */
export function validateLessonDateTimeFormat(date: string, time?: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }

  if (time) {
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!timeRegex.test(time.trim())) {
      return false;
    }
  }

  return true;
}

/**
 * Parses a date-only string (YYYY-MM-DD) into a Date object.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing the date at midnight UTC, or null if invalid
 * 
 * @example
 * parseDateOnly("2024-01-15")
 * // Returns Date object for January 15, 2024 at 00:00:00 UTC
 */
export function parseDateOnly(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  try {
    // Validate format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString.trim())) {
      console.warn(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
      return null;
    }

    const dateParts = dateString.trim().split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateParts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn(`Invalid date values: ${dateString}`);
      return null;
    }

    const dateTime = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    if (isNaN(dateTime.getTime())) {
      console.warn(`Invalid date/time combination: ${dateString}`);
      return null;
    }

    const utcYear = dateTime.getUTCFullYear();
    const utcMonth = dateTime.getUTCMonth();
    const utcDay = dateTime.getUTCDate();

    if (utcYear !== year || utcMonth !== month || utcDay !== day) {
      console.warn(`Invalid calendar date: ${dateString} (normalized to ${utcYear}-${utcMonth + 1}-${utcDay})`);
      return null;
    }

    return dateTime;
  } catch (error) {
    console.error(`Error parsing date:`, error);
    return null;
  }
}

