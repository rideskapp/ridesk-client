import { TimeSlotConfig } from "@/types/availability";

export const GLOBAL_TIME_INCREMENT_MINUTES = 15;

export function formatDateLocal(date: Date): string {
  // Validate input
  if (!(date instanceof Date)) {
    throw new TypeError("formatDateLocal expects a Date object");
  }
  if (isNaN(date.getTime())) {
    throw new TypeError("formatDateLocal received an Invalid Date");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a time string (e.g. "09:00" or "09:00:00") to extract the hour.
 * Returns null if the input is missing, invalid, or outside 0-23.
 * Used with ?? default for school open/close: parseHour(school?.openHoursStart) ?? 9
 */
export function parseHour(timeStr: string | undefined | null): number | null {
  if (timeStr == null) return null;
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

/**
 * Derive start/end hours from school open/close strings. Uses parseHour and
 * falls back to defaults when missing, invalid, or when start >= end.
 * Defaults (9, 19) align with generateTimeSlots for consistency.
 */
export function getSchoolHourBounds(
  openHoursStart: string | undefined | null,
  openHoursEnd: string | undefined | null,
  defaultStart: number = 9,
  defaultEnd: number = 19,
): { startHour: number; endHour: number } {
  let startHour = parseHour(openHoursStart) ?? defaultStart;
  let endHour = parseHour(openHoursEnd) ?? defaultEnd;
  if (startHour >= endHour) {
    startHour = defaultStart;
    endHour = defaultEnd;
  }
  return { startHour, endHour };
}

/**
 * Generate time slots between startHour and endHour using a minute-based increment.
 * For example, startHour=9, endHour=18, incrementMinutes=30 will produce:
 * 09:00-09:30, 09:30-10:00, ..., 17:30-18:00.
 */
export function generateMinuteSlots(
  startHour: number,
  endHour: number,
  incrementMinutes: number,
): TimeSlotConfig[] {
  const slots: TimeSlotConfig[] = [];
  if (incrementMinutes <= 0) {
    return slots;
  }

  const dayStartMinutes = startHour * 60;
  const dayEndMinutes = endHour * 60;

  for (
    let start = dayStartMinutes;
    start < dayEndMinutes;
    start += incrementMinutes
  ) {
    const end = Math.min(start + incrementMinutes, dayEndMinutes);
    if (end <= start) continue;

    const startHourVal = Math.floor(start / 60);
    const startMinuteVal = start % 60;
    const endHourVal = Math.floor(end / 60);
    const endMinuteVal = end % 60;

    const startStr = `${String(startHourVal).padStart(2, "0")}:${String(
      startMinuteVal,
    ).padStart(2, "0")}`;
    const endStr = `${String(endHourVal).padStart(2, "0")}:${String(
      endMinuteVal,
    ).padStart(2, "0")}`;

    slots.push({ start: startStr, end: endStr });
  }

  return slots;
}

export function generateQuarterHourSlots(
  startHour: number = 9,
  endHour: number = 19,
): TimeSlotConfig[] {
  return generateMinuteSlots(startHour, endHour, GLOBAL_TIME_INCREMENT_MINUTES);
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationToRows(
  durationMinutes: number,
  unitMinutes: number = GLOBAL_TIME_INCREMENT_MINUTES,
): number {
  return Math.max(1, Math.ceil(durationMinutes / unitMinutes));
}

export function generateTimeSlots(
  startHour: number = 9,
  endHour: number = 19,
  intervalHours: number = 1,
): TimeSlotConfig[] {
  const slots: TimeSlotConfig[] = [];
  for (let hour = startHour; hour < endHour; hour += intervalHours) {
    // Cap the end time to not exceed endHour
    const slotEnd = Math.min(hour + intervalHours, endHour);
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(slotEnd).padStart(2, "0")}:00`;
    slots.push({ start, end });
  }
  return slots;
}

export function getWeekBoundaries(date: Date): {
  weekStart: Date;
  weekEnd: Date;
} {
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return { weekStart, weekEnd };
}

export function timeToMinutes(timeStr: string): number {
  // Validate input
  if (typeof timeStr !== "string") {
    throw new TypeError("timeToMinutes expects a string");
  }

  const parts = timeStr.trim().split(":");
  if (parts.length !== 2) {
    throw new TypeError(
      `timeToMinutes expects format "HH:MM", got "${timeStr}"`,
    );
  }

  const hours = parseInt(parts[0].trim(), 10);
  const minutes = parseInt(parts[1].trim(), 10);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new TypeError(
      `timeToMinutes received non-numeric values in "${timeStr}"`,
    );
  }

  if (hours < 0 || hours > 23) {
    throw new TypeError(`timeToMinutes hours must be 0-23, got ${hours}`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new TypeError(`timeToMinutes minutes must be 0-59, got ${minutes}`);
  }

  return hours * 60 + minutes;
}

export function compareTime(time1: string, time2: string): number {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);
  return minutes1 - minutes2;
}
