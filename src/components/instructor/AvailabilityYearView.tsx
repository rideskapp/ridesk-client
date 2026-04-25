import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { useAuthStore } from "@/store/auth";
import { availabilityApi, AvailabilitySlot } from "@/services/availability";

interface AvailabilityYearViewProps {
  currentDate: Date;
  onDateClick?: (date: Date) => void;
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];

const AvailabilityYearView: React.FC<AvailabilityYearViewProps> = ({
  currentDate,
  onDateClick,
}) => {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();

  const year = currentDate.getFullYear();

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  const yearStartStr = useMemo(() => `${year}-01-01`, [year]);
  const yearEndStr = useMemo(() => `${year}-12-31`, [year]);

  const { data: availability = [], isLoading: loading } = useQuery({
    queryKey: ['instructor-availability', user?.id, yearStartStr, yearEndStr],
    queryFn: () => availabilityApi.getRange(user!.id, yearStartStr, yearEndStr),
    enabled: !!user?.id,
    staleTime: 120000, // Cache for 2 minutes
  });

  const availabilityByDate = useMemo(() => {
    const index = new Map<string, AvailabilitySlot[]>();
    for (const a of availability) {
      const dateStr = a.date;
      const arr = index.get(dateStr) || [];
      arr.push(a);
      index.set(dateStr, arr);
    }
    return index;
  }, [availability]);

  const getMonthAvailability = (monthDate: Date): { percentage: number; status: "full" | "partial" | "none" } => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    let availableDays = 0;
    let totalDays = 0;
    
    for (const day of monthDays) {
      const dateStr = isoDate(day);
      const daySlots = availabilityByDate.get(dateStr) || [];
      const activeSlots = daySlots.filter(a => a.active);
      
      if (activeSlots.length > 0) {
        const timeSlots = [];
        for (let hour = 9; hour <= 18; hour++) {
          timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
        }
        
        let coveredCount = 0;
        for (const time of timeSlots) {
          const isCovered = activeSlots.some(slot => {
            const slotStart = slot.time_start.substring(0, 5);
            const slotEnd = slot.time_end.substring(0, 5);
            return time >= slotStart && time < slotEnd;
          });
          if (isCovered) coveredCount++;
        }
        
        if (coveredCount > 0) {
          availableDays++;
        }
      }
      totalDays++;
    }
    
    const percentage = totalDays > 0 ? (availableDays / totalDays) * 100 : 0;
    
    if (percentage === 0) return { percentage, status: "none" };
    if (percentage === 100) return { percentage, status: "full" };
    return { percentage, status: "partial" };
  };

  const today = new Date();
  const isToday = (date: Date) => isSameDay(date, today);

  const handleDateClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  const dayNames = useMemo(() => {
    const sunday = new Date(2024, 0, 7); 
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      return day.toLocaleDateString(i18n.language, { weekday: "short" }).toUpperCase();
    });
  }, [i18n.language]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((_month, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="h-5 w-24 bg-gray-200 rounded mx-auto"></div>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div key={j} className="h-8 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month, monthIndex) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
          const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

          // Group days into weeks
          const weeks: Date[][] = [];
          for (let i = 0; i < calendarDays.length; i += 7) {
            weeks.push(calendarDays.slice(i, i + 7));
          }

          const monthAvailability = getMonthAvailability(month);
          const isCurrentMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();

          return (
            <div
              key={monthIndex}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                isCurrentMonth ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {/* Month Header */}
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">
                  {month.toLocaleDateString(i18n.language, { month: "long", year: "numeric" })}
                </h3>
                <div
                  className={`w-3 h-3 rounded-full ${
                    monthAvailability.status === "full"
                      ? "bg-green-500"
                      : monthAvailability.status === "partial"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  title={`${monthAvailability.percentage.toFixed(0)}% available`}
                ></div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-0 border-b border-gray-200">
                {dayNames.map((dayName, index) => (
                  <div
                    key={index}
                    className="p-1 border-r border-gray-200 bg-gray-50 font-semibold text-[10px] text-center text-gray-600 uppercase last:border-r-0"
                  >
                    {dayName.substring(0, 1)}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="p-2">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                    {week.map((day) => {
                      const dateStr = isoDate(day);
                      const daySlots = availabilityByDate.get(dateStr) || [];
                      const activeSlots = daySlots.filter(a => a.active);
                      const hasAvailability = activeSlots.length > 0;
                      const isCurrentMonthDay = day.getMonth() === month.getMonth();
                      const isTodayDay = isToday(day);

                      return (
                        <button
                          key={dateStr}
                          onClick={() => handleDateClick(day)}
                          className={`
                            w-6 h-6 text-[10px] rounded transition-colors
                            ${!isCurrentMonthDay
                              ? "text-gray-300 hover:bg-gray-100"
                              : isTodayDay
                              ? "bg-blue-600 text-white font-semibold"
                              : hasAvailability
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-white text-gray-700 hover:bg-gray-100"}
                          `}
                          title={
                            isCurrentMonthDay
                              ? `${day.toLocaleDateString(i18n.language)} - ${hasAvailability ? "Available" : "Not available"}`
                              : ""
                          }
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-700">Fully Available Month</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-700">Partially Available Month</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-700">Not Available Month</span>
          </div>
          <div className="text-xs text-gray-500">
            Click on a date to view its day view
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityYearView;

