import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { useAuthStore } from "@/store/auth";
import { availabilityApi, AvailabilitySlot } from "@/services/availability";

interface AvailabilityMonthViewProps {
  currentDate: Date;
  onDateClick?: (date: Date) => void;
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];

const AvailabilityMonthView: React.FC<AvailabilityMonthViewProps> = ({
  currentDate,
  onDateClick,
}) => {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate.getFullYear(), currentDate.getMonth()]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate.getFullYear(), currentDate.getMonth()]);
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart]); // sunday = 0
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd]);
  const calendarDays = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

  // Group days into weeks 
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarDays]);

  const monthStartStr = useMemo(() => isoDate(monthStart), [monthStart]);
  const monthEndStr = useMemo(() => isoDate(monthEnd), [monthEnd]);

  const { data: availability = [], isLoading: loading } = useQuery({
    queryKey: ['instructor-availability', user?.id, monthStartStr, monthEndStr],
    queryFn: () => availabilityApi.getRange(user!.id, monthStartStr, monthEndStr),
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
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

  const getDayAvailability = (date: Date): "full" | "partial" | "none" => {
    const dateStr = isoDate(date);
    const daySlots = availabilityByDate.get(dateStr) || [];
    const activeSlots = daySlots.filter(a => a.active);
    
    if (activeSlots.length === 0) return "none";
    
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
    
    if (coveredCount === 0) return "none";
    if (coveredCount === timeSlots.length) return "full";
    return "partial";
  };

  const today = new Date();
  const isToday = (date: Date) => isSameDay(date, today);
  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

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
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-0 border-b-2 border-gray-300">
          {dayNames.map((_dayName, index) => (
            <div
              key={index}
              className="p-3 border-r border-gray-200 bg-gray-50 font-semibold text-xs text-center text-gray-600 uppercase last:border-r-0"
            >
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
          ))}
        </div>
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-0 border-b border-gray-200">
              {week.map((day) => (
                <div
                  key={isoDate(day)}
                  className="p-2 min-h-[100px] border-r border-gray-200 bg-white animate-pulse last:border-r-0"
                >
                  <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0 border-b-2 border-gray-300">
          {dayNames.map((dayName, index) => (
            <div
              key={index}
              className="p-3 border-r border-gray-200 bg-gray-50 font-semibold text-xs text-center text-gray-600 uppercase last:border-r-0"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-0 border-b border-gray-200 last:border-b-0">
              {week.map((day) => {
                const dateStr = isoDate(day);
                const availabilityStatus = getDayAvailability(day);
                const isCurrentMonthDay = isCurrentMonth(day);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative p-2 min-h-[100px] border-r border-gray-200 text-left
                      transition-colors
                      ${!isCurrentMonthDay 
                        ? "bg-white text-gray-400 hover:bg-gray-50" 
                        : isTodayDay
                        ? "bg-blue-50 hover:bg-blue-100 text-gray-900"
                        : "bg-white text-gray-900 hover:bg-gray-50"}
                      last:border-r-0
                    `}
                    title={isCurrentMonthDay ? `Click to view availability for ${day.toLocaleDateString(i18n.language)}` : ""}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                          ${isTodayDay
                            ? "bg-blue-600 text-white"
                            : isCurrentMonthDay
                            ? "text-gray-900 hover:bg-gray-100"
                            : "text-gray-400"}
                        `}
                      >
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Availability Indicator */}
                    {isCurrentMonthDay && (
                      <div className="mt-1 flex justify-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            availabilityStatus === "full"
                              ? "bg-green-500"
                              : availabilityStatus === "partial"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          title={
                            availabilityStatus === "full"
                              ? "Fully available"
                              : availabilityStatus === "partial"
                              ? "Partially available"
                              : "Not available"
                          }
                        ></div>
                      </div>
                    )}

                    {/* Month label for days outside current month */}
                    {!isCurrentMonthDay && day.getDate() === 1 && (
                      <div className="text-xs text-gray-400 mt-1 font-medium">
                        {day.toLocaleDateString(i18n.language, { month: "short" })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-700">Fully Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-700">Partially Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-700">Not Available</span>
          </div>
          <div className="text-xs text-gray-500">
            Click on a date to view its day view
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityMonthView;

