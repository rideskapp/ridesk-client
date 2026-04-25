import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

interface MonthlyCalendarGridProps {
  currentDate: Date;
  lessonsByDate: Record<string, number>;
  onDateClick?: (date: Date) => void;
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];

const MonthlyCalendarGrid: React.FC<MonthlyCalendarGridProps> = ({
  currentDate,
  lessonsByDate,
  onDateClick,
}) => {
  const { i18n } = useTranslation();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // sunday = 0
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group days into weeks (7 days per week)
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarDays]);

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
                const lessonCount = lessonsByDate[dateStr] || 0;
                const isCurrentMonthDay = isCurrentMonth(day);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative p-2 min-h-[100px] border-r border-b border-gray-200 text-left
                      transition-colors
                      ${!isCurrentMonthDay 
                        ? "bg-white text-gray-400 hover:bg-gray-50" 
                        : isTodayDay
                        ? "bg-blue-50 hover:bg-blue-100 text-gray-900"
                        : "bg-white text-gray-900 hover:bg-gray-50"}
                      last:border-r-0
                    `}
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

                    {/* Lesson Indicators i.e green badges */}
                    {lessonCount > 0 && isCurrentMonthDay && (
                      <div className="mt-1">
                        <div
                          className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded"
                          title={`${lessonCount} lesson${lessonCount > 1 ? "s" : ""}`}
                        >
                          {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}
                        </div>
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
    </div>
  );
};

export default MonthlyCalendarGrid;

