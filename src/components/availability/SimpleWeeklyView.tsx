import React from 'react';
import { format } from 'date-fns';
import { DayAvailability, TimeSlotConfig } from '@/types/availability';

interface SimpleWeeklyViewProps {
  availabilityData: DayAvailability[];
  onSlotToggle: (date: Date, timeSlot: TimeSlotConfig) => void;
  onColumnToggle: (date: Date) => void;
  onRowToggle: (timeSlot: string) => void;
  timeSlots: TimeSlotConfig[];
  weekDays: Date[];
  isProcessing: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'MON' },
  { value: 2, label: 'Tuesday', short: 'TUE' },
  { value: 3, label: 'Wednesday', short: 'WED' },
  { value: 4, label: 'Thursday', short: 'THU' },
  { value: 5, label: 'Friday', short: 'FRI' },
  { value: 6, label: 'Saturday', short: 'SAT' },
  { value: 0, label: 'Sunday', short: 'SUN' },
];

export const SimpleWeeklyView: React.FC<SimpleWeeklyViewProps> = ({
  availabilityData,
  onSlotToggle,
  onColumnToggle,
  onRowToggle,
  timeSlots,
  weekDays,
  isProcessing,
}) => {
  const getSlotStatus = (
    date: Date,
    timeSlot: string,
  ): 'available' | 'unavailable' => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = availabilityData.find((d) => d.date === dateStr);

    if (!dayData || !dayData.time_slots) {
      return 'unavailable';
    }

    const slots = dayData.time_slots;
    type TimeSlot = typeof slots[number];
    const slot = slots.find((s: TimeSlot) =>
      s.start_time.substring(0, 5) === timeSlot.substring(0, 5),
    );

    if (!slot) {
      return 'unavailable';
    }

    return slot.available === true ? 'available' : 'unavailable';
  };

  const getDayStatus = (date: Date): 'available' | 'partial' | 'off' => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = availabilityData.find((d) => d.date === dateStr);

    if (!dayData) {
      return 'off';
    }

    return dayData.day_status as 'available' | 'partial' | 'off';
  };

  const getRowStatus = (
    timeSlot: TimeSlotConfig,
  ): 'available' | 'partial' | 'unavailable' => {
    let availableCount = 0;
    let totalCount = 0;

    weekDays.forEach((date) => {
      const status = getSlotStatus(date, timeSlot.start);
      totalCount++;
      if (status === 'available') availableCount++;
    });

    if (availableCount === totalCount) return 'available';
    if (availableCount === 0) return 'unavailable';
    return 'partial';
  };

  const getDayStatusColor = (
    status: 'available' | 'partial' | 'off',
  ): string => {
    switch (status) {
      case 'available':
        return 'bg-green-50 hover:bg-green-100 focus:bg-green-100';
      case 'partial':
        return 'bg-yellow-50 hover:bg-yellow-100 focus:bg-yellow-100';
      case 'off':
        return 'bg-red-50 hover:bg-red-100 focus:bg-red-100';
      default:
        return '';
    }
  };

  const getRowStatusColor = (
    status: 'available' | 'partial' | 'unavailable',
  ): string => {
    switch (status) {
      case 'available':
        return 'bg-green-50 hover:bg-green-100 focus:bg-green-100';
      case 'partial':
        return 'bg-yellow-50 hover:bg-yellow-100 focus:bg-yellow-100';
      case 'unavailable':
        return 'bg-red-50 hover:bg-red-100 focus:bg-red-100';
      default:
        return '';
    }
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="bg-gray-100 p-3 text-left font-semibold text-sm border-b border-r min-w-max">
              Time
            </th>
            {weekDays.map((date, index) => {
              const dayInfo = DAYS_OF_WEEK.find((d) => d.value === date.getDay());
              const dayStatus = getDayStatus(date);

              return (
                <th
                  key={index}
                  className="bg-gray-100 border-b border-r p-0"
                >
                  <button
                    type="button"
                    disabled={isProcessing}
                    aria-label={`Toggle ${dayInfo?.label} ${format(date, 'd MMM')} - currently ${dayStatus}`}
                    aria-pressed={dayStatus === 'available'}
                    className={`w-full p-3 text-center font-semibold text-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isProcessing ? getDayStatusColor(dayStatus) : ''
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={() => !isProcessing && onColumnToggle(date)}
                  >
                    <div className="day-header-content">
                      <div className="day-name font-bold">{dayInfo?.short}</div>
                      <div className="day-date text-xs text-gray-600 mt-1">
                        {format(date, 'd MMM')}
                      </div>
                      <div className="text-xs mt-1 font-medium">
                        {dayStatus === 'available'
                          ? 'All'
                          : dayStatus === 'partial'
                            ? 'Some'
                            : 'None'}
                      </div>
                    </div>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot, timeIndex) => {
            const rowStatus = getRowStatus(timeSlot);

            return (
              <tr key={timeIndex}>
                <td
                  className="border-b border-r p-0 text-sm font-medium"
                >
                  <button
                    type="button"
                    disabled={isProcessing}
                    aria-label={`Toggle ${timeSlot.start}-${timeSlot.end} for all days - currently ${rowStatus}`}
                    aria-pressed={rowStatus === 'available'}
                    className={`w-full p-3 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isProcessing ? getRowStatusColor(rowStatus) : ''
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={() => !isProcessing && onRowToggle(timeSlot.start)}
                  >
                    {timeSlot.start}-{timeSlot.end}
                  </button>
                </td>
                {weekDays.map((date, dayIndex) => {
                  const slotStatus = getSlotStatus(date, timeSlot.start);

                  return (
                    <td
                      key={dayIndex}
                      className="border-b border-r p-0"
                    >
                      <button
                        type="button"
                        disabled={isProcessing}
                        aria-label={`${format(date, 'EEEE, MMMM d')} at ${timeSlot.start}-${timeSlot.end} - ${slotStatus === 'available' ? 'Available' : 'Not available'}`}
                        aria-pressed={slotStatus === 'available'}
                        className={`w-full h-12 cursor-pointer transition-all focus:outline-none focus:ring-2 ${!isProcessing
                          ? slotStatus === 'available'
                            ? 'bg-green-50 hover:bg-green-100 focus:bg-green-100 focus:ring-green-500'
                            : 'bg-red-50 hover:bg-red-100 focus:bg-red-100 focus:ring-red-500'
                          : 'opacity-50 cursor-not-allowed'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => {
                          if (!isProcessing) {
                            onSlotToggle(date, timeSlot);
                          }
                        }}
                      >
                        <div className="flex items-center justify-center h-full">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${slotStatus === 'available' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                          >
                            {slotStatus === 'available' ? '✓' : '✗'}
                          </div>
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

