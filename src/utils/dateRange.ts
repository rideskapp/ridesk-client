import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export type PeriodType = "day" | "week" | "month";

/**
 * Calculates date range based on a date and period type
 * @param date - The base date
 * @param period - The period type (day, week, or month)
 * @returns Object with startDate and endDate formatted as yyyy-MM-dd
 */
export const calculateDateRange = (
  date: Date,
  period: PeriodType
): { startDate: string; endDate: string } => {
  let start: Date;
  let end: Date;

  switch (period) {
    case "day":
      start = startOfDay(date);
      end = endOfDay(date);
      break;
    case "week":
      start = startOfWeek(date, { weekStartsOn: 1 });
      end = endOfWeek(date, { weekStartsOn: 1 });
      break;
    case "month":
    default:
      start = startOfMonth(date);
      end = endOfMonth(date);
  }

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
};

