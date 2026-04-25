import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, subDays, isSameMonth } from 'date-fns';
import { formatDateLocal } from '@/utils/dateHelpers';
import {
  AggregatedAvailabilityData,
  Instructor,
} from '@/types/availability';

interface AggregatedMonthlyViewProps {
  currentDate: Date;
  aggregatedData: AggregatedAvailabilityData;
  instructors: Instructor[];
  onDayClick?: (date: Date) => void;
}

export function AggregatedMonthlyView({
  currentDate,
  aggregatedData,
  instructors,
  onDayClick,
}: AggregatedMonthlyViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const startDate = subDays(monthStart, getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1);
  const endDate = addDays(monthEnd, 7 - (getDay(monthEnd) === 0 ? 7 : getDay(monthEnd)));
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const getDayStats = (date: Date) => {
    let totalInstructors = 0;
    let instructorsWithAvailability = 0;

    instructors.forEach((instructor) => {
      const data = aggregatedData[instructor.id];
      if (data?.availabilityData) {
        const dateStr = formatDateLocal(date);
        const dayData = data.availabilityData.find((d: any) => d.date === dateStr);

        if (dayData?.time_slots) {
          totalInstructors++;
          let slots;
          try {
            slots = Array.isArray(dayData.time_slots)
              ? dayData.time_slots
              : JSON.parse(dayData.time_slots);
          } catch (error) {
            console.error(`Failed to parse time_slots for instructor ${instructor.id} on ${dateStr}:`, error);
            slots = []; // Fallback to empty array
          }

          const hasAvailability = slots.some((s: any) => s.available === true);
          if (hasAvailability) {
            instructorsWithAvailability++;
          }
        }
      }
    });

    return {
      availableInstructors: instructorsWithAvailability,
      totalInstructors,
    };
  };

  // Memoize monthly stats to avoid redundant getDayStats calls
  const monthlyStats = useMemo(() => {
    const monthDays = days.filter((day) => isSameMonth(day, currentDate));

    if (monthDays.length === 0) {
      return { avgPercentage: 0, bestDay: '-' };
    }

    // Compute stats for each day once
    const dayStatsMap = new Map();
    monthDays.forEach((day) => {
      dayStatsMap.set(day.getTime(), getDayStats(day));
    });

    // Calculate totals
    const totalAvailable = monthDays.reduce(
      (sum, day) => sum + dayStatsMap.get(day.getTime()).availableInstructors,
      0,
    );
    const totalPossible = monthDays.reduce(
      (sum, day) => sum + dayStatsMap.get(day.getTime()).totalInstructors,
      0,
    );
    const avgPercentage = totalPossible > 0 ? Math.round((totalAvailable / totalPossible) * 100) : 0;

    // Find best day
    const bestDay = monthDays.reduce((best, day) => {
      const dayStats = dayStatsMap.get(day.getTime());
      const bestStats = dayStatsMap.get(best.getTime());
      const dayRatio =
        dayStats.totalInstructors > 0
          ? dayStats.availableInstructors / dayStats.totalInstructors
          : 0;
      const bestRatio =
        bestStats.totalInstructors > 0
          ? bestStats.availableInstructors / bestStats.totalInstructors
          : 0;
      return dayRatio > bestRatio ? day : best;
    }, monthDays[0]);

    return {
      avgPercentage,
      bestDay: format(bestDay, 'MM/dd'),
    };
  }, [days, currentDate, aggregatedData, instructors]);

  const getAvailabilityColor = (available: number, total: number) => {
    if (total === 0) return 'bg-gray-200';
    const ratio = available / total;
    if (ratio === 1) return 'bg-green-500';
    if (ratio >= 0.67) return 'bg-green-400';
    if (ratio >= 0.33) return 'bg-yellow-500';
    if (ratio > 0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="p-3 text-center font-semibold text-sm bg-gray-50 border-b-2 border-gray-200">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const stats = getDayStats(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday =
            format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <button
              key={index}
              type="button"
              disabled={!isCurrentMonth}
              aria-label={`${format(day, 'MMMM d, yyyy')} - ${stats.availableInstructors} of ${stats.totalInstructors} instructors available`}
              className={`min-h-[120px] cursor-pointer transition-all hover:bg-gray-50 border rounded-lg p-3 bg-white ${!isCurrentMonth ? 'opacity-40 bg-gray-50 cursor-not-allowed' : ''
                } ${isToday ? 'ring-2 ring-blue-400' : ''} disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => isCurrentMonth && onDayClick?.(day)}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-base font-semibold ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}
                >
                  {format(day, 'd')}
                </span>
                {isToday && <div className="w-2 h-2 bg-blue-400 rounded-full"></div>}
              </div>

              {stats.totalInstructors > 0 && (
                <div className="flex items-center justify-center mt-4">
                  <div
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-white font-semibold text-xs ${getAvailabilityColor(
                      stats.availableInstructors,
                      stats.totalInstructors,
                    )}`}
                  >
                    {stats.availableInstructors}/{stats.totalInstructors}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-3">Monthly Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold">
              {monthlyStats.avgPercentage}%
            </div>
            <div className="text-sm text-gray-600">Average Availability</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-lg font-bold">
              {monthlyStats.bestDay}
            </div>
            <div className="text-sm text-gray-600">Best Day</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold">{instructors.length}</div>
            <div className="text-sm text-gray-600">Active Instructors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
