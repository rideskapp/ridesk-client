import React from 'react';
import { format, addDays } from 'date-fns';
import { formatDateLocal, generateQuarterHourSlots, getWeekBoundaries } from '@/utils/dateHelpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AggregatedAvailabilityData,
  Instructor,
} from '@/types/availability';

interface AggregatedWeeklyViewProps {
  currentDate: Date;
  aggregatedData: AggregatedAvailabilityData;
  instructors: Instructor[];
  onSlotClick?: (instructorId: string, date: Date, timeSlot?: string) => void;
}

// Helper function to check slot availability for a specific instructor, date, and time
const getSlotAvailability = (
  instructorId: string,
  date: Date,
  timeSlot: string,
  aggregatedData: AggregatedAvailabilityData
): boolean => {
  const data = aggregatedData[instructorId];
  if (!data?.availabilityData) return false;

  const dateStr = formatDateLocal(date);
  const dayData = data.availabilityData.find((d: any) => d.date === dateStr);

  if (!dayData?.time_slots) return false;

  // Safely handle time_slots being either an array or JSON string
  let slots: any[] = [];
  if (Array.isArray(dayData.time_slots)) {
    slots = dayData.time_slots;
  } else if (typeof dayData.time_slots === 'string') {
    try {
      const parsed = JSON.parse(dayData.time_slots);
      if (Array.isArray(parsed)) {
        slots = parsed;
      }
    } catch (error) {
      console.error('Failed to parse time_slots JSON:', error);
      return false;
    }
  }

  const slot = slots.find(
    (s: any) => s.start_time?.substring(0, 5) === timeSlot.substring(0, 5)
  );

  return slot?.available === true;
};

export function AggregatedWeeklyView({
  currentDate,
  aggregatedData,
  instructors,
  onSlotClick,
}: AggregatedWeeklyViewProps) {
  const timeSlots = generateQuarterHourSlots();
  const hourSlots = React.useMemo(() => {
    const slots: Array<{ start: string; end: string }> = [];
    for (let hour = 9; hour < 19; hour++) {
      slots.push({
        start: `${String(hour).padStart(2, "0")}:00`,
        end: `${String(hour + 1).padStart(2, "0")}:00`,
      });
    }
    return slots;
  }, []);

  const { weekStart } = getWeekBoundaries(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAvailabilityStats = (date: Date, timeSlot: string) => {
    let available = 0;

    instructors.forEach((instructor) => {
      if (getSlotAvailability(instructor.id, date, timeSlot, aggregatedData)) {
        available++;
      }
    });

    return { available, total: instructors.length };
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-gray-100 p-3 text-left font-semibold text-sm border-b border-r min-w-max">
                Time / Instructor
              </th>
              {weekDays.map((day, index) => (
                <th key={index} className="bg-gray-100 p-3 text-center font-semibold text-sm border-b border-r">
                  <div className="font-bold">{format(day, 'EEE').toUpperCase()}</div>
                  <div className="text-xs text-gray-600 mt-1">{format(day, 'MM/dd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourSlots.map((hourSlot) => (
              <React.Fragment key={hourSlot.start}>
                <tr className="bg-gray-50">
                  <td className="p-3 text-sm font-medium text-gray-600 border-b border-r">
                    {hourSlot.start} - {hourSlot.end}
                  </td>

                  {weekDays.map((day, dayIndex) => {
                    const hourPrefix = `${hourSlot.start.split(":")[0]}:`;
                    const quarterTimes = timeSlots
                      .map((slot) => slot.start)
                      .filter((start) => start.startsWith(hourPrefix));
                    const stats = quarterTimes.reduce(
                      (acc, quarterTime) => {
                        const quarterStats = getAvailabilityStats(day, quarterTime);
                        return {
                          available: acc.available + quarterStats.available,
                          total: acc.total + quarterStats.total,
                        };
                      },
                      { available: 0, total: 0 },
                    );
                    return (
                      <td
                        key={dayIndex}
                        className="p-3 text-center border-b border-r"
                      >
                        <span className="inline-flex items-center justify-center bg-gray-100 rounded-full px-2 py-1 text-xs font-semibold">
                          {stats.available}/{stats.total}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {instructors.map((instructor) => (
                  <tr key={`${hourSlot.start}-${instructor.id}`}>
                    <td className="p-2 border-b border-r text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={instructor.avatar} alt={`${instructor.first_name} ${instructor.last_name}`} />
                          <AvatarFallback className="text-[10px]">
                            {instructor.first_name?.[0]}{instructor.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {instructor.first_name} {instructor.last_name}
                        </span>
                      </div>
                    </td>

                    {weekDays.map((day) => {
                      const hourPrefix = `${hourSlot.start.split(":")[0]}:`;
                      const quarterTimes = timeSlots
                        .map((slot) => slot.start)
                        .filter((start) => start.startsWith(hourPrefix));
                      const isAvailable = quarterTimes.every((quarterTime) =>
                        getSlotAvailability(instructor.id, day, quarterTime, aggregatedData),
                      );

                      const handleKeyDown = (event: React.KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          if (onSlotClick) {
                            onSlotClick(instructor.id, day, hourSlot.start);
                          }
                        }
                      };

                      return (
                        <td
                          key={`${instructor.id}-${formatDateLocal(day)}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${instructor.first_name} ${instructor.last_name} on ${format(day, 'EEEE, MMMM d')} at ${hourSlot.start} - ${isAvailable ? 'Available' : 'Not available'}`}
                          className={`p-2 border-b border-r cursor-pointer transition-all ${isAvailable
                            ? 'bg-green-50 hover:bg-green-100 focus:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500'
                            : 'bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400'
                            }`}
                          onClick={() =>
                            onSlotClick && onSlotClick(instructor.id, day, hourSlot.start)
                          }
                          onKeyDown={handleKeyDown}
                        >
                          <div className="flex items-center justify-center min-h-[40px]">
                            <span
                              className={`text-xs font-medium ${
                                isAvailable ? "text-green-600" : "text-gray-500"
                              }`}
                            >
                              {isAvailable ? "Available" : "Not Available"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-3">Daily Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            let totalSlots = 0;
            let availableSlots = 0;

            timeSlots.forEach((timeSlot) => {
              const stats = getAvailabilityStats(day, timeSlot.start);
              totalSlots += stats.total;
              availableSlots += stats.available;
            });

            const percentage = totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0;

            return (
              <div key={index} className="text-center p-2 bg-white rounded">
                <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                <div className="text-xs text-gray-600">{format(day, 'MM/dd')}</div>
                <div className="mt-1">
                  <div className="text-lg font-bold">{percentage}%</div>
                  <div className="text-xs text-gray-600">
                    {availableSlots}/{totalSlots}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
