import React, { useMemo } from 'react';
import { formatDateLocal, generateQuarterHourSlots } from '@/utils/dateHelpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AggregatedAvailabilityData,
  Instructor,
  DayAvailability,
} from '@/types/availability';

interface AggregatedDailyViewProps {
  currentDate: Date;
  aggregatedData: AggregatedAvailabilityData;
  instructors: Instructor[];
  onSlotClick?: (instructorId: string, date: Date, timeSlot?: string) => void;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export function AggregatedDailyView({
  currentDate,
  aggregatedData,
  instructors,
  onSlotClick,
}: AggregatedDailyViewProps) {
  const timeSlots = generateQuarterHourSlots();
  const hourSlots = useMemo(() => {
    const slots: Array<{ start: string; end: string }> = [];
    for (let hour = 9; hour < 19; hour++) {
      slots.push({
        start: `${String(hour).padStart(2, "0")}:00`,
        end: `${String(hour + 1).padStart(2, "0")}:00`,
      });
    }
    return slots;
  }, []);

  // Compute availability map once using useMemo to avoid redundant JSON parsing
  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    const dateStr = formatDateLocal(currentDate);

    instructors.forEach((instructor) => {
      const data = aggregatedData[instructor.id];
      if (!data?.availabilityData) {
        // Mark all slots as unavailable for this instructor
        timeSlots.forEach((timeSlot) => {
          map.set(`${instructor.id}-${timeSlot.start}`, false);
        });
        return;
      }

      const dayData = data.availabilityData.find(
        (d: DayAvailability) => d.date === dateStr
      );

      if (!dayData?.time_slots) {
        // Mark all slots as unavailable for this instructor
        timeSlots.forEach((timeSlot) => {
          map.set(`${instructor.id}-${timeSlot.start}`, false);
        });
        return;
      }

      // Parse time_slots with proper error handling
      let slots: TimeSlot[] = [];
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
          // slots remains empty array on parse failure
        }
      }

      // Validate and map each time slot
      timeSlots.forEach((timeSlot) => {
        const slot = slots.find(
          (s: TimeSlot) =>
            s.start_time?.substring(0, 5) === timeSlot.start.substring(0, 5)
        );
        map.set(`${instructor.id}-${timeSlot.start}`, slot?.available === true);
      });
    });

    return map;
  }, [instructors, timeSlots, aggregatedData, currentDate]);

  // Handle keyboard interaction for accessibility
  const handleKeyDown = (
    event: React.KeyboardEvent,
    instructorId: string,
    timeSlot: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onSlotClick) {
        onSlotClick(instructorId, currentDate, timeSlot);
      }
    }
  };

  // Compute summary statistics using the availability map
  const { totalSlots, availableSlots, percentage } = useMemo(() => {
    let total = 0;
    let available = 0;

    timeSlots.forEach((timeSlot) => {
      instructors.forEach((instructor) => {
        total++;
        if (availabilityMap.get(`${instructor.id}-${timeSlot.start}`)) {
          available++;
        }
      });
    });

    const pct = total > 0 ? Math.round((available / total) * 100) : 0;

    return {
      totalSlots: total,
      availableSlots: available,
      percentage: pct,
    };
  }, [timeSlots, instructors, availabilityMap]);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-gray-100 p-4 border-b border-r font-semibold text-sm">
                Time
              </th>
              {instructors.map((instructor) => (
                <th key={instructor.id} className="bg-gray-100 p-4 text-center border-b border-r">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={instructor.avatar} alt={`${instructor.first_name} ${instructor.last_name}`} />
                      <AvatarFallback className="text-xs">
                        {instructor.first_name?.[0]}{instructor.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {instructor.first_name} {instructor.last_name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourSlots.map((hourSlot) => (
              <React.Fragment key={hourSlot.start}>
                <tr>
                  <td className="p-2 border-b border-r text-sm text-gray-600 font-medium">
                    <div className="flex items-center justify-center">
                      {hourSlot.start}-{hourSlot.end}
                    </div>
                  </td>

                  {instructors.map((instructor) => {
                    const hourPrefix = `${hourSlot.start.split(":")[0]}:`;
                    const quarterTimes = timeSlots
                      .map((slot) => slot.start)
                      .filter((start) => start.startsWith(hourPrefix));
                    const isAvailable = quarterTimes.every(
                      (start) => availabilityMap.get(`${instructor.id}-${start}`) || false,
                    );

                    return (
                      <td
                        key={`${hourSlot.start}-${instructor.id}`}
                        className="border-b border-r relative"
                      >
                        <button
                          type="button"
                          aria-label={`${instructor.first_name} ${instructor.last_name} at ${hourSlot.start} - ${isAvailable ? 'Available' : 'Not available'}`}
                          className={`w-full h-20 transition-colors cursor-pointer ${isAvailable
                            ? 'bg-green-50 hover:bg-green-100 focus:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500'
                            : 'bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400'
                            }`}
                          onClick={() =>
                            onSlotClick &&
                            onSlotClick(instructor.id, currentDate, hourSlot.start)
                          }
                          onKeyDown={(e) => handleKeyDown(e, instructor.id, hourSlot.start)}
                        >
                          <div className="flex items-center justify-center h-full">
                            <span
                              className={`text-xs font-medium ${
                                isAvailable ? "text-green-600" : "text-gray-500"
                              }`}
                            >
                              {isAvailable ? "Available" : "Not Available"}
                            </span>
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50 mt-4">
        <h4 className="font-semibold mb-3">Daily Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{percentage}%</div>
            <div className="text-sm text-gray-600">Total Availability</div>
            <div className="text-xs text-gray-500 mt-1">
              {availableSlots}/{totalSlots} slots
            </div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">
              {instructors.length}
            </div>
            <div className="text-sm text-gray-600">Active Instructors</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{timeSlots.length}</div>
            <div className="text-sm text-gray-600">Time Slots</div>
          </div>
        </div>
      </div>
    </div>
  );
}
