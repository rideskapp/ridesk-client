//Hook for period-based compensation aggregation


import { useQuery } from "@tanstack/react-query";
import { compensationApi, type InstructorCompensationSummary, type CompensationReport } from "@/services/compensation";
import { useAuthStore } from "@/store/auth";
import { useCompensationMode } from "./useCompensationMode";
import { UserRole } from "@/types";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";

export type PeriodType = "day" | "week" | "month";

export interface UseCompensationsParams {
  instructorId?: string;
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  schoolId?: string;
}

export const useInstructorCompensations = (params: UseCompensationsParams = {}) => {
  const { user } = useAuthStore();
  const { instructorId, period = "week", startDate, endDate, schoolId } = params;

  const { isEnabled: isCompensationEnabled } = useCompensationMode();

  const shouldFetch = user?.role === UserRole.INSTRUCTOR || isCompensationEnabled;

  const getDateRange = (): { startDate: string; endDate: string } => {
    if (startDate && endDate) {
      return { startDate, endDate };
    }

    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case "day":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  };

  const dateRange = getDateRange();
  const targetSchoolId = schoolId || user?.schoolId;

  const {
    data: instructorSummary,
    isLoading: isLoadingInstructor,
    error: instructorError,
    refetch: refetchInstructor,
  } = useQuery<InstructorCompensationSummary>({
    queryKey: ["instructor-compensation", instructorId, dateRange.startDate, dateRange.endDate, targetSchoolId],
    queryFn: () => {
      if (!instructorId) throw new Error("Instructor ID is required");
      if (!targetSchoolId) throw new Error("School ID is required");
      return compensationApi.calculateCompensation(
        instructorId,
        dateRange.startDate,
        dateRange.endDate,
        targetSchoolId,
      );
    },
    enabled: shouldFetch && !!instructorId && !!targetSchoolId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const {
    data: report,
    isLoading: isLoadingReport,
    error: reportError,
    refetch: refetchReport,
  } = useQuery<CompensationReport>({
    queryKey: ["compensation-report", dateRange.startDate, dateRange.endDate, targetSchoolId],
    queryFn: () => {
      if (!targetSchoolId) throw new Error("School ID is required");
      return compensationApi.getCompensationReport(
        dateRange.startDate,
        dateRange.endDate,
        targetSchoolId,
      );
    },
    enabled: shouldFetch && !instructorId && !!targetSchoolId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const isLoading = instructorId ? isLoadingInstructor : isLoadingReport;
  const error = instructorId ? instructorError : reportError;
  const refetch = instructorId ? refetchInstructor : refetchReport;

  const stats = instructorId && instructorSummary
    ? {
      totalCompensation: instructorSummary.totalCompensation,
      activeInstructors: 1,
      totalLessons: instructorSummary.lessonCount,
      totalHours: instructorSummary.totalHours,
      averagePerLesson: instructorSummary.lessonCount > 0
        ? instructorSummary.totalCompensation / instructorSummary.lessonCount
        : 0,
      averagePerHour: instructorSummary.totalHours > 0
        ? instructorSummary.totalCompensation / instructorSummary.totalHours
        : 0,
      paidCompensation: instructorSummary.paidCompensation,
      unpaidCompensation: instructorSummary.unpaidCompensation,
      paidLessonCount: instructorSummary.paidLessonCount,
      unpaidLessonCount: instructorSummary.unpaidLessonCount,
    }
    : report?.stats;

  return {
    instructorSummary: (instructorId && targetSchoolId) ? instructorSummary : undefined,

    report: (!instructorId && targetSchoolId) ? report : undefined,

    stats,

    dateRange,

    loading: isLoading,
    error,
    refetch,
  };
};

export const getPreviousPeriod = (period: PeriodType): { startDate: string; endDate: string } => {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case "day":
      const yesterday = subDays(now, 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
      break;
    case "week":
      const lastWeek = subWeeks(now, 1);
      start = startOfWeek(lastWeek, { weekStartsOn: 1 });
      end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      break;
    case "month":
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    default:
      const lastWeekDefault = subWeeks(now, 1);
      start = startOfWeek(lastWeekDefault, { weekStartsOn: 1 });
      end = endOfWeek(lastWeekDefault, { weekStartsOn: 1 });
  }

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
};

export type { InstructorCompensationSummary, CompensationReport };

