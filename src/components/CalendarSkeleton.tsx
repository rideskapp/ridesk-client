import React from "react";

interface CalendarSkeletonProps {
  instructorCount?: number;
  timeSlotCount?: number;
}

export const CalendarSkeleton: React.FC<CalendarSkeletonProps> = ({
  instructorCount = 3,
  timeSlotCount = 10,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `120px repeat(${instructorCount}, minmax(200px, 1fr))`,
          }}
        >
          {/* Time Column Header */}
          <div className="p-4 border-r border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 font-semibold text-sm sticky left-0 z-[1]">
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Instructor Column Headers - Skeleton */}
          {Array.from({ length: instructorCount }).map((_, index) => (
            <div
              key={index}
              className="p-4 border-r border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 font-semibold text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex gap-1">
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Time Slots and Instructor Columns - Skeleton */}
          {Array.from({ length: timeSlotCount }).map((_, slotIndex) => (
            <React.Fragment key={slotIndex}>
              <div className="p-3 border-r border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 text-xs font-semibold h-[90px] flex items-center justify-center sticky left-0 z-[1] bg-white">
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>

              {Array.from({ length: instructorCount }).map((_, instructorIndex) => (
                <div
                  key={`${instructorIndex}-${slotIndex}`}
                  className="w-full p-2 relative min-h-[90px] border-r border-b border-gray-200"
                >
                  <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarSkeleton;
