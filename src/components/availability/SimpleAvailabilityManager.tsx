import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, addDays, subDays, startOfYear, endOfYear, eachDayOfInterval } from "date-fns";
import {
  formatDateLocal,
  generateTimeSlots,
  getWeekBoundaries,
  getSchoolHourBounds,
} from "@/utils/dateHelpers";
import { useSimpleAvailability } from "@/hooks/useSimpleAvailability";
import { useSchool } from "@/hooks/useSchool";
import {
  useWeeklyAvailability,
  useSpecialDates,
  isDayAvailable,
} from "@/hooks/useSchoolCalendar";
import { SimpleWeeklyView } from "./SimpleWeeklyView";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { TimeSlotConfig } from "@/types/availability";
import { CalendarDays } from "lucide-react";

const OPENING_PERIOD_BATCH_SIZE = 400;


interface SimpleAvailabilityManagerProps {
  instructorId: string;
  instructorName: string;
  schoolId?: string;
  initialDate?: Date;
  onClose?: () => void;
}

export const SimpleAvailabilityManager: React.FC<
  SimpleAvailabilityManagerProps
> = ({
  instructorId,
  instructorName,
  schoolId,
  initialDate = new Date(),
  onClose,
}) => {
    const { t } = useTranslation();
    const sm = "availability.simpleManager";
    const [currentDate, setCurrentDate] = useState(initialDate);
    const { school } = useSchool(schoolId);

    // Always check school open/close first, fallback to 9/18 when missing or invalid
    const timeSlots = useMemo(() => {
      const { startHour, endHour } = getSchoolHourBounds(
        school?.openHoursStart,
        school?.openHoursEnd,
      );
      return generateTimeSlots(startHour, endHour);
    }, [
      school?.openHoursStart,
      school?.openHoursEnd,
    ]);

    const yearStart = useMemo(() => startOfYear(currentDate), [currentDate]);
    const yearEnd = useMemo(() => endOfYear(currentDate), [currentDate]);
    const specialsFrom = formatDateLocal(yearStart);
    const specialsTo = formatDateLocal(yearEnd);

    const {
      data: weekly,
      isSuccess: weeklyReady,
      isLoading: weeklyCalendarLoading,
    } = useWeeklyAvailability(schoolId);

    const {
      data: specials,
      isSuccess: specialsReady,
      isLoading: specialsCalendarLoading,
    } = useSpecialDates(specialsFrom, specialsTo, schoolId);

    const calendarReady =
      weeklyReady &&
      Array.isArray(weekly) &&
      weekly.length === 7 &&
      specialsReady &&
      Array.isArray(specials);

    const openDaysInYear = useMemo(() => {
      if (!calendarReady || !weekly) return [];
      return eachDayOfInterval({ start: yearStart, end: yearEnd }).filter((d) =>
        isDayAvailable(weekly, specials, d),
      );
    }, [calendarReady, weekly, specials, yearStart, yearEnd]);

    const [fillingOpeningPeriod, setFillingOpeningPeriod] = useState(false);

    const {
      availabilityData,
      loading,
      error,
      fetchAvailabilityData,
      toggleSlot,
      toggleDay,
      toggleTimeRow,
      setAvailabilityForRange,
      removeAllForRange,
    } = useSimpleAvailability(instructorId);

    const fetchWeekData = useCallback(() => {
      const { weekStart, weekEnd } = getWeekBoundaries(currentDate);
      return fetchAvailabilityData(formatDateLocal(weekStart), formatDateLocal(weekEnd));
    }, [currentDate, fetchAvailabilityData]);

    useEffect(() => {
      fetchWeekData();
    }, [fetchWeekData]);

    const { weekStart, weekEnd } = getWeekBoundaries(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const handlePreviousWeek = () => {
      setCurrentDate(subDays(currentDate, 7));
    };

    const handleNextWeek = () => {
      setCurrentDate(addDays(currentDate, 7));
    };

    const handleToday = () => {
      setCurrentDate(new Date());
    };

    // Check if every slot in the week is already active
    const allWeekSelected = useMemo(() => {
      if (!timeSlots || timeSlots.length === 0) return false;
      return weekDays.every((day) => {
        const dateStr = formatDateLocal(day);
        const dayData = availabilityData.find(d => d.date === dateStr);
        if (!dayData) return false;
        return timeSlots.every((slot) => {
          const normalizedStart = slot.start.length === 5 ? `${slot.start}:00` : slot.start;
          return dayData.time_slots.some(
            s => s.start_time.startsWith(normalizedStart.substring(0, 5)) && s.available
          );
        });
      });
    }, [weekDays, timeSlots, availabilityData]);

    const handleFillOpeningPeriod = async () => {
      if (!timeSlots.length || openDaysInYear.length === 0) return;

      const allSlots: Array<{ date: string; timeStart: string; timeEnd: string }> = [];
      for (const day of openDaysInYear) {
        const dateStr = formatDateLocal(day);
        for (const slot of timeSlots) {
          allSlots.push({
            date: dateStr,
            timeStart: slot.start,
            timeEnd: slot.end,
          });
        }
      }

      setFillingOpeningPeriod(true);
      try {
        for (let i = 0; i < allSlots.length; i += OPENING_PERIOD_BATCH_SIZE) {
          const chunk = allSlots.slice(i, i + OPENING_PERIOD_BATCH_SIZE);
          await setAvailabilityForRange(chunk);
        }
        await fetchWeekData();
        toast.success(
          t(`${sm}.toast.fillOpeningPeriodSuccess`, {
            count: openDaysInYear.length,
            year: currentDate.getFullYear(),
          }),
        );
      } catch (err) {
        toast.error(t(`${sm}.toast.fillOpeningPeriodError`));
        console.error(err);
      } finally {
        setFillingOpeningPeriod(false);
      }
    };

    const handleSelectAll = async () => {
      try {
        if (!timeSlots || timeSlots.length === 0) return;

        if (allWeekSelected) {
          // Unselect all — fetch fresh data and remove all active slots
          await removeAllForRange(
            formatDateLocal(weekStart),
            formatDateLocal(weekEnd),
          );
          await fetchWeekData();
          toast.success(t(`${sm}.toast.weekUnselected`));
        } else {
          // Select all — add missing slots
          const allSlots: Array<{ date: string; timeStart: string; timeEnd: string }> = [];

          weekDays.forEach((day) => {
            const dateStr = formatDateLocal(day);
            timeSlots.forEach((slot) => {
              allSlots.push({
                date: dateStr,
                timeStart: slot.start,
                timeEnd: slot.end,
              });
            });
          });

          await setAvailabilityForRange(allSlots);
          await fetchWeekData();
          toast.success(t(`${sm}.toast.weekSelected`));
        }
      } catch (err) {
        toast.error(
          allWeekSelected ? t(`${sm}.toast.unselectAllFailed`) : t(`${sm}.toast.selectAllFailed`),
        );
        console.error(err);
      }
    };

    const handleSlotToggle = async (date: Date, timeSlot: TimeSlotConfig) => {
      try {
        await toggleSlot(formatDateLocal(date), timeSlot.start, timeSlot.end);
        await fetchWeekData();
        toast.success(t(`${sm}.toast.slotUpdated`));
      } catch (err) {
        toast.error(t(`${sm}.toast.slotUpdateFailed`));
        console.error(err);
      }
    };

    const handleColumnToggle = async (date: Date) => {
      try {
        await toggleDay(formatDateLocal(date), timeSlots);
        await fetchWeekData();
        toast.success(t(`${sm}.toast.dayUpdated`));
      } catch (err) {
        toast.error(t(`${sm}.toast.dayUpdateFailed`));
        console.error(err);
      }
    };

    const handleRowToggle = async (timeSlot: string) => {
      try {
        await toggleTimeRow(
          timeSlot,
          weekDays.map((d) => formatDateLocal(d)),
        );
        await fetchWeekData();
        toast.success(t(`${sm}.toast.timeRowUpdated`));
      } catch (err) {
        toast.error(t(`${sm}.toast.timeRowUpdateFailed`));
        console.error(err);
      }
    };

    const handleRetry = () => {
      fetchWeekData();
    };

    if (loading && availabilityData.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold">
            {t(`${sm}.scheduleTitle`, { name: instructorName })}
          </h3>
          {error && (
            <div className="flex items-center gap-2">
              <div className="text-xs sm:text-sm text-red-600">{error}</div>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                disabled={loading}
                aria-label={t(`${sm}.retryAriaLabel`)}
                className="text-xs sm:text-sm"
              >
                {t("common.retry")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handlePreviousWeek}
              variant="outline"
              size="sm"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              {t("common.previous")}
            </Button>

            <div className="px-2 sm:px-4 py-2 border rounded font-semibold min-w-[160px] sm:min-w-[200px] text-center text-xs sm:text-sm">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </div>

            <Button
              onClick={handleNextWeek}
              variant="outline"
              size="sm"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              {t("common.next")}
            </Button>

            <Button
              onClick={handleToday}
              variant="outline"
              size="sm"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              {t("availability.today")}
            </Button>

            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              {allWeekSelected ? t(`${sm}.unselectAll`) : t(`${sm}.selectAll`)}
            </Button>

            <Button
              onClick={handleFillOpeningPeriod}
              variant="default"
              size="sm"
              disabled={
                loading ||
                fillingOpeningPeriod ||
                !calendarReady ||
                weeklyCalendarLoading ||
                specialsCalendarLoading ||
                !timeSlots.length ||
                openDaysInYear.length === 0
              }
              className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
              title={
                calendarReady && openDaysInYear.length > 0
                  ? t(`${sm}.fillOpeningPeriodTitle`, { year: currentDate.getFullYear() })
                  : t(`${sm}.fillOpeningPeriodTitleUnavailable`)
              }
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              {fillingOpeningPeriod
                ? t(`${sm}.fillOpeningPeriodWorking`)
                : t(`${sm}.fillOpeningPeriod`)}
            </Button>
          </div>

          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm w-full sm:w-auto"
            >
              {t("common.close")}
            </Button>
          )}
        </div>

        <SimpleWeeklyView
          availabilityData={availabilityData}
          onSlotToggle={handleSlotToggle}
          onColumnToggle={handleColumnToggle}
          onRowToggle={handleRowToggle}
          timeSlots={timeSlots}
          weekDays={weekDays}
          isProcessing={loading}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <p className="font-semibold mb-2">{t(`${sm}.howToUseTitle`)}</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>{t(`${sm}.howToUseSlot`)}</li>
            <li>{t(`${sm}.howToUseDayHeader`)}</li>
            <li>{t(`${sm}.howToUseTimeRow`)}</li>
            <li>{t(`${sm}.howToUseSelectAll`)}</li>
            <li>
              {t(`${sm}.howToUseFillOpeningPeriod`, {
                year: currentDate.getFullYear(),
              })}
            </li>
          </ul>
        </div>
      </div>
    );
  };
