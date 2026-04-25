import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportingApi, type ReportingData } from "../services/reporting";
import { calculateDateRange, type PeriodType } from "../utils/dateRange";

export type { PeriodType };

export interface UseReportingParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  schoolId?: string;
}

export interface UseReportingReturn {
  data: ReportingData | null;
  loading: boolean;
  error: Error | null;
  dateRange: { startDate: string; endDate: string };
}

export const useReporting = ({ period, startDate, endDate, schoolId }: UseReportingParams): UseReportingReturn => {
  // Validate date inputs: both must be provided together, or neither
  useEffect(() => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      console.warn(
        `useReporting: Partial date input detected. Both startDate and endDate must be provided together. ` +
        `Ignoring partial input and falling back to period-based calculation (period: ${period}).`
      );
    }
  }, [startDate, endDate, period]);

  // Calculate date range based on period if custom dates not provided
  // Note: If only one date is provided, it will be ignored and period-based calculation will be used
  const dateRange = useMemo(() => {
    // Validate that both dates are provided and non-empty
    if (startDate && endDate && startDate.trim() !== "" && endDate.trim() !== "") {
      // Validate date format (yyyy-MM-dd)
      const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateFormatRegex.test(startDate) || !dateFormatRegex.test(endDate)) {
        console.warn(
          `useReporting: Invalid date format. Expected yyyy-MM-dd format. ` +
          `Received startDate: ${startDate}, endDate: ${endDate}. Falling back to period-based calculation.`
        );
        const now = new Date();
        return calculateDateRange(now, period);
      }

      // Validate date parsing
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn(
          `useReporting: Invalid date values. Could not parse startDate: ${startDate} or endDate: ${endDate}. ` +
          `Falling back to period-based calculation.`
        );
        const now = new Date();
        return calculateDateRange(now, period);
      }

      // Validate date ordering
      if (start > end) {
        console.warn(
          `useReporting: startDate (${startDate}) is after endDate (${endDate}). ` +
          `Falling back to period-based calculation.`
        );
        const now = new Date();
        return calculateDateRange(now, period);
      }

      return { startDate, endDate };
    }

    const now = new Date();
    return calculateDateRange(now, period);
  }, [period, startDate, endDate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reporting", schoolId ?? null, dateRange.startDate, dateRange.endDate],
    queryFn: () => reportingApi.getReportingData(schoolId, dateRange.startDate, dateRange.endDate),
    staleTime: 60000, // Cache for 1 minute
    retry: 1, // Retry once on failure for reporting data
    refetchOnWindowFocus: false, // Prevent automatic refetch when tab regains focus (reporting is computationally intensive)
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error as Error | null,
    dateRange,
  };
};

