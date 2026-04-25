import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDrag, useDrop } from "react-dnd";
import { useAuthStore } from "@/store/auth";
import { lessonsApi } from "@/services/lessons";
import { availabilityApi } from "@/services/availability";
import { Badge } from "@/components/ui/badge";
import { GLOBAL_TIME_INCREMENT_MINUTES } from "@/utils/dateHelpers";
import { toast } from "react-hot-toast";

interface InstructorCalendarGridProps {
  currentDate: Date;
  schoolId?: string;
}

const getSchoolColor = (schoolName?: string | null) => {
  if (!schoolName) return "linear-gradient(135deg, #EC4899CC, #EC4899)";

  // Simple hash function to generate a stable color index
  let hash = 0;
  for (let i = 0; i < schoolName.length; i++) {
    hash = schoolName.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pre-defined gradients for schools
  const gradients = [
    "linear-gradient(135deg, #EC4899CC, #EC4899)", // Pink (default)
    "linear-gradient(135deg, #3B82F6CC, #3B82F6)", // Blue
    "linear-gradient(135deg, #10B981CC, #10B981)", // Green
    "linear-gradient(135deg, #F59E0BCC, #F59E0B)", // Amber
    "linear-gradient(135deg, #8B5CF6CC, #8B5CF6)", // Violet
    "linear-gradient(135deg, #EF4444CC, #EF4444)", // Red
    "linear-gradient(135deg, #06B6D4CC, #06B6D4)", // Cyan
    "linear-gradient(135deg, #F97316CC, #F97316)", // Orange
  ];

  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

interface Lesson {
  id: string;
  instructor_id: string;
  student_first_name?: string | null;
  student_last_name?: string | null;
  date: string;
  time: string; // HH:mm:ss
  duration: number; // minutes
  discipline?: string | null;
  product_name?: string | null;
  lesson_status_name?: string | null;
  payment_status_name?: string | null;
  school_name?: string | null;
  school_logo?: string | null;
}

const DRAG_TYPES = {
  LESSON: "lesson",
};

interface DragItem {
  type: string;
  lesson: Lesson;
}

interface SchoolLogoProps {
  logo?: string | null;
  name?: string | null;
}

const SchoolLogo: React.FC<SchoolLogoProps> = ({ logo, name }) => {
  const [error, setError] = React.useState(false);

  if (logo && !error) {
    return (
      <img
        src={logo}
        alt={name || "School"}
        className="w-4 h-4 rounded-full object-cover border border-white/30"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] text-white font-semibold">
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

const InstructorCalendarGrid: React.FC<InstructorCalendarGridProps> = ({ currentDate, schoolId }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);

  const dateStr = currentDate.toISOString().split("T")[0];

  const timeSlots = useMemo(() => {
    const slots = [] as Array<{ time: string; endTime: string }>;
    const dayStartMinutes = 9 * 60;
    const dayEndMinutes = 19 * 60;
    for (
      let start = dayStartMinutes;
      start < dayEndMinutes;
      start += GLOBAL_TIME_INCREMENT_MINUTES
    ) {
      const end = Math.min(start + GLOBAL_TIME_INCREMENT_MINUTES, dayEndMinutes);
      const startHour = Math.floor(start / 60);
      const startMinute = start % 60;
      const endHour = Math.floor(end / 60);
      const endMinute = end % 60;
      const t = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
      const e = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
      slots.push({ time: t, endTime: e });
    }
    return slots;
  }, []);

  const hourSlots = useMemo(() => {
    const slots = [] as Array<{ time: string; endTime: string }>;
    for (let hour = 9; hour < 19; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
      });
    }
    return slots;
  }, []);

  const { data: lessons = [], isLoading: lessonsLoading, error: lessonsError } = useQuery({
    queryKey: ['instructor-lessons-day', dateStr, user?.id, schoolId],
    queryFn: () => lessonsApi.listByRange({ startDate: dateStr, endDate: dateStr, limit: 200, schoolId }),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: availability = [], isLoading: availabilityLoading } = useQuery({
    queryKey: ['instructor-availability-day', dateStr, user?.id],
    queryFn: () => availabilityApi.getRange(user!.id, dateStr, dateStr),
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  const loading = lessonsLoading || availabilityLoading;
  const error = lessonsError;

  const lessonsIndex = useMemo(() => {
    const index = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const startTime = l.time.substring(0, 5); // HH:mm
      const duration = l.duration || 60;
      const slotsNeeded = Math.ceil(duration / GLOBAL_TIME_INCREMENT_MINUTES);

      // Calculate all time slots this lesson occupies
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);

      for (let i = 0; i < slotsNeeded; i++) {
        const slotStartMinutes = startHour * 60 + startMinute + i * GLOBAL_TIME_INCREMENT_MINUTES;
        const slotHour = Math.floor(slotStartMinutes / 60);
        const slotMinute = slotStartMinutes % 60;
        const slotTime = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;

        const arr = index.get(slotTime) || [];
        arr.push(l);
        index.set(slotTime, arr);
      }
    }
    return index;
  }, [lessons]);
  const timeSlotSet = useMemo(() => new Set(timeSlots.map((slot) => slot.time)), [timeSlots]);

  const isTimeSlotAvailable = (time: string): boolean => {
    const activeAvailability = availability.filter((slot) => slot.active);

    const isAvailable = activeAvailability.some((slot) => {
      const slotStart = slot.time_start.substring(0, 5);
      const slotEnd = slot.time_end.substring(0, 5);
      return time >= slotStart && time < slotEnd;
    });

    return isAvailable;
  };

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/lessons/${lesson.id}`, { state: { from: 'calendar' } });
  };

  const toMinutes = (time: string): number => {
    const [h, m] = time.substring(0, 5).split(":").map(Number);
    return h * 60 + m;
  };

  const toTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const canDropLessonAt = (lesson: Lesson, time: string): boolean => {
    const duration = lesson.duration || GLOBAL_TIME_INCREMENT_MINUTES;
    const slotsNeeded = Math.max(1, Math.ceil(duration / GLOBAL_TIME_INCREMENT_MINUTES));
    const startMinutes = toMinutes(time);

    for (let i = 0; i < slotsNeeded; i++) {
      const slotTime = toTime(startMinutes + i * GLOBAL_TIME_INCREMENT_MINUTES);
      if (!timeSlotSet.has(slotTime) || !isTimeSlotAvailable(slotTime)) {
        return false;
      }
      const slotLessons = lessonsIndex.get(slotTime) || [];
      const hasOtherLesson = slotLessons.some((l) => l.id !== lesson.id);
      if (hasOtherLesson) return false;
    }
    return true;
  };

  const handleDrop = async (item: DragItem, newTime: string) => {
    const lesson = item.lesson;
    if (!canDropLessonAt(lesson, newTime)) return;
    try {
      await lessonsApi.reschedule(lesson.id, {
        date: dateStr,
        timeStart: newTime,
        durationMinutes: lesson.duration,
      });
      await queryClient.invalidateQueries({ queryKey: ["instructor-lessons-day"] });
      await queryClient.invalidateQueries({ queryKey: ["instructor-lessons"] });
      toast.success(t("lessons.rescheduled"));
    } catch {
      toast.error(t("lessons.rescheduleFailed"));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid gap-0" style={{ gridTemplateColumns: `120px minmax(280px, 1fr)` }}>
            {/* Skeleton loading */}
            <div className="p-3 border-r border-b-2 border-gray-300 bg-gray-50 sticky left-0 z-[2] box-border">
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
            <div className="p-3 border-r border-b-2 border-gray-300 bg-gray-50 box-border">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>

            {timeSlots.map(({ time }) => (
              <React.Fragment key={time}>
                <div className="p-2 border-r border-b border-gray-200 bg-white h-[90px] flex items-center justify-center sticky left-0 z-[1] box-border">
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>

                <div className="w-full h-[90px] p-2 border-r border-b border-gray-200 bg-white box-border">
                  <div className="w-full h-full p-2 rounded-lg bg-gray-50 animate-pulse">
                    <div className="h-3 w-20 bg-gray-200 rounded mx-auto mt-2"></div>
                    <div className="h-2 w-16 bg-gray-200 rounded mx-auto mt-3"></div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-sm">{(error as Error)?.message || "Failed to load data"}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid gap-0" style={{ gridTemplateColumns: `120px minmax(280px, 1fr)` }}>
            <div className="p-3 border-r border-b-2 border-gray-300 bg-gray-50 font-semibold text-xs text-center text-gray-600 sticky left-0 z-[20] box-border">
              <div>{t("calendar.time")}</div>
            </div>
            <div className="p-3 border-r border-b-2 border-gray-300 bg-gray-50 font-semibold text-xs text-center text-gray-600 box-border">
              <div>{user?.firstName} {user?.lastName}</div>
            </div>

            {hourSlots.map(({ time, endTime }) => {
              const hourPrefix = `${time.split(":")[0]}:`;
              const quarterTimes = timeSlots
                .map((slot) => slot.time)
                .filter((slotTime) => slotTime.startsWith(hourPrefix));
              const quarterSet = new Set(quarterTimes);

              const hourLessonsRaw = quarterTimes.flatMap(
                (slotTime) => lessonsIndex.get(slotTime) || [],
              );
              const slotLessons = Array.from(
                new Map(hourLessonsRaw.map((lesson) => [lesson.id, lesson])).values(),
              );
              const startingLessons = slotLessons.filter((l) =>
                quarterSet.has(l.time.substring(0, 5)),
              );
              const hasStartingLesson = startingLessons.length > 0;
              const continuingOccupied = slotLessons.some(
                (l) => !quarterSet.has(l.time.substring(0, 5)),
              );
              const isAvailable = quarterTimes.every((slotTime) =>
                isTimeSlotAvailable(slotTime),
              );

              return (
                <React.Fragment key={time}>
                  {/* Time Slot Cell */}
                  <div className="p-2 border-r border-b border-gray-200 bg-white text-xs font-semibold h-[90px] flex items-center justify-center sticky left-0 z-[20] text-gray-700 box-border">
                    <div className="text-center">
                      {time}-{endTime}
                    </div>
                  </div>

                  {/* Lesson Cell */}
                  <div className="w-full h-[90px] p-2 border-r border-b border-gray-200 bg-white relative box-border z-[3]">
                    <div className="absolute inset-0 grid grid-rows-4 gap-0 z-[5]">
                      {quarterTimes.map((quarterTime) => (
                        <DropQuarter
                          key={`${time}-${quarterTime}`}
                          time={quarterTime}
                          showDragHints={!!draggedLessonId}
                          canDropLessonAt={canDropLessonAt}
                          onDrop={handleDrop}
                        />
                      ))}
                    </div>
                    {hasStartingLesson ? (
                      <div className={`space-y-1 h-full relative ${draggedLessonId ? "pointer-events-none" : ""}`}>
                        {startingLessons.map((l) => {
                          const rowSpan = Math.ceil((l.duration || 60) / GLOBAL_TIME_INCREMENT_MINUTES);
                          const mobileCellHeight = 90;
                          const mobileQuarterHeight = mobileCellHeight / 4;
                          const startMinute =
                            parseInt(l.time.substring(3, 5), 10) || 0;
                          const quarterOffset = startMinute / 15;
                          const topOffset = 8 + quarterOffset * mobileQuarterHeight;
                          return (
                            <div
                              key={l.id}
                              className="absolute z-[10]"
                              style={{
                                height: `${rowSpan * mobileQuarterHeight - 6}px`,
                                width: 'calc(100% - 16px)',
                                top: `${topOffset}px`,
                                left: '8px',
                              }}
                            >
                              <DraggableLesson lesson={l} onDragStateChange={setDraggedLessonId}>
                              <div className="w-full h-full cursor-pointer" onClick={() => handleLessonClick(l)}>
                                <div className="w-full h-full p-2 text-white rounded-lg transition-all duration-150 shadow-sm flex flex-col items-center justify-center hover:shadow-md box-border" style={{ background: getSchoolColor(l.school_name) }}>
                                  <div className="text-xs font-semibold text-white flex items-center gap-1 flex-wrap justify-center">
                                    <span className="truncate">{l.product_name || t("lessons.title")}</span>
                                    {l.discipline && (
                                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0 shrink-0">{l.discipline}</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <SchoolLogo logo={l.school_logo} name={l.school_name} />
                                    <span className="text-[10px] text-white/90 truncate font-medium max-w-[80px]">
                                      {l.school_name}
                                    </span>
                                  </div>
                                  <div className="text-xs text-white/90 mt-0.5 truncate text-center">
                                    {l.student_first_name && l.student_last_name ? `${l.student_first_name} ${l.student_last_name}` : ""}
                                  </div>
                                  {l.lesson_status_name && (
                                    <div className="mt-1 flex justify-center">
                                      <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/30">{l.lesson_status_name}</Badge>
                                    </div>
                                  )}
                                  {l.duration && (
                                    <div className="text-xs text-white/80 mt-0.5 text-center">
                                      {l.duration} min
                                    </div>
                                  )}
                                </div>
                              </div>
                              </DraggableLesson>
                            </div>
                          );
                        })}
                      </div>
                    ) : continuingOccupied ? (
                      <div className="w-full h-full opacity-0 pointer-events-none" />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center relative z-[2] ${
                          isAvailable
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-100"
                        }`}
                      >
                        {isAvailable ? (
                          <span className="text-xs font-medium text-green-600">
                            {t("availability.available", { defaultValue: "Available" })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {t("calendar.notAvailable", { defaultValue: "Not Available" })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorCalendarGrid;

const DraggableLesson: React.FC<{
  lesson: Lesson;
  children: React.ReactNode;
  onDragStateChange?: (lessonId: string | null) => void;
}> = ({ lesson, children, onDragStateChange }) => {
  const wasDraggingRef = useRef(false);
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPES.LESSON,
    item: { type: DRAG_TYPES.LESSON, lesson },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  useEffect(() => {
    if (!onDragStateChange) return;
    if (isDragging && !wasDraggingRef.current) {
      onDragStateChange(lesson.id);
    } else if (!isDragging && wasDraggingRef.current) {
      onDragStateChange(null);
    }
    wasDraggingRef.current = isDragging;
  }, [isDragging, lesson.id, onDragStateChange]);
  return <div ref={drag} className="w-full h-full cursor-move">{children}</div>;
};

const DropQuarter: React.FC<{
  time: string;
  showDragHints?: boolean;
  canDropLessonAt: (lesson: Lesson, time: string) => boolean;
  onDrop: (item: DragItem, time: string) => void;
}> = ({ time, showDragHints = false, canDropLessonAt, onDrop }) => {
  const { t } = useTranslation();
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DRAG_TYPES.LESSON,
    canDrop: (item: DragItem) => canDropLessonAt(item.lesson, time),
    drop: (item: DragItem) => onDrop(item, time),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  return (
    <div
      ref={drop}
      className={`w-full h-full flex items-center justify-center transition-all duration-200 ${
        isOver && canDrop
          ? "bg-green-200 ring-2 ring-green-500 ring-inset"
          : showDragHints
            ? "border-t border-dashed border-gray-200/80 hover:bg-green-100/60"
            : ""
      }`}
    >
      {showDragHints && isOver && canDrop ? (
        <span className="text-[9px] md:text-[10px] font-medium text-green-800">
          {`${t("calendar.dropAt", { defaultValue: "Drop at" })} ${time}`}
        </span>
      ) : null}
    </div>
  );
};



