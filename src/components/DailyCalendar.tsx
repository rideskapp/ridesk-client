import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDrag, useDrop } from "react-dnd";
import { Badge } from "@/components/ui/badge";
import { Plus, X, MoreVertical, User as UserIcon, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lessonsApi } from "@/services/lessons";
import { availabilityApi, AvailabilitySlot } from "@/services/availability";
import { roleAwareApi } from "@/services/role-aware-api";
import { LessonCardStyle } from "@/types/calendar";
import { studentsApi } from "@/services/students";
import { useUserRole } from "@/hooks/useUserRole";
import { lessonCreationApi } from "@/services/lessonCreation";
import LessonCreationDialog from "./LessonCreationDialog";
import { useSpecialDates, useWeeklyAvailability, isDayAvailable } from "@/hooks/useSchoolCalendar";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useSchool } from "@/hooks/useSchool";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { UserRole } from "@/types";
import CalendarSkeleton from "./CalendarSkeleton";
import {
  GLOBAL_TIME_INCREMENT_MINUTES,
  formatDateLocal,
} from "@/utils/dateHelpers";

interface DailyCalendarProps {
  currentDate: Date;
  onCreateLesson?: (data: {
    time: string;
    instructorId: string;
    date: string;
    duration?: number;
  }) => void;
  onLessonClick?: (lesson: any) => void;
  disciplineColors?: Record<string, string>;
  visibleInstructorIds?: string[];
  onDeleteLesson?: (lessonId: string) => void;
  onEditLesson?: (lesson: any) => void;
  onRescheduleLesson?: (lessonId: string, newDate: string, newTime: string, newInstructorId: string, duration: number) => void;
  activeDiscipline?: string;
  schoolId?: string;
  // bulk data props 
  lessons?: Lesson[];
  instructors?: Instructor[];
  students?: Student[];
  availability?: AvailabilitySlot[];
  specialDates?: Array<{ date: string; is_available: boolean; reason?: string | null }>;
  weeklyAvailability?: Array<{ weekday: number; is_available: boolean }>;
  conflictLessons?: Array<{
    id: string;
    instructor_id: string;
    school_id: string;
    date: string;
    time: string;
    duration: number;
    school_name: string | null;
    school_logo: string | null;
  }>;
}

interface Lesson {
  id: string;
  instructor_id: string;
  instructor_first_name?: string | null;
  instructor_last_name?: string | null;
  student_id?: string | null;
  student_first_name?: string | null;
  student_last_name?: string | null;
  date: string;
  time: string;
  duration: number;
  discipline?: string | null;
  level?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  product_category_id?: string | null;
  booking_id?: string | null;
  lesson_status_id?: string | null;
  lesson_status_name?: string | null;
  payment_status_id?: string | null;
  payment_status_name?: string | null;
}

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  specialties: string[];
  isActive: boolean;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Drag and drop types
const DRAG_TYPES = {
  LESSON: 'lesson',
};

interface DragItem {
  type: string;
  lesson: Lesson;
}

// Draggable Lesson Component
const DraggableLessonBase: React.FC<{
  lesson: Lesson;
  disciplineColors: Record<string, string>;
  onLessonClick?: (lesson: any) => void;
  onDeleteLesson?: (lessonId: string) => void;
  onEditLesson?: (lesson: any) => void;
  onDragStateChange?: (lesson: Lesson | null) => void;
  dimmed?: boolean;
  studentName?: string;
  colorScheme?: 'discipline' | 'student_level' | 'category';
  studentLevelColors?: Record<string, string>;
  categoryColors?: Record<string, string>;
  compactMode?: boolean;
}> = ({ 
  lesson, 
  disciplineColors, 
  onLessonClick, 
  onDeleteLesson,
  onEditLesson,
  onDragStateChange,
  dimmed = false, 
  studentName,
  colorScheme = 'discipline',
  studentLevelColors = {},
  categoryColors = {},
  compactMode = false,
}) => {
  const { t } = useTranslation();
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
      onDragStateChange(lesson);
    } else if (!isDragging && wasDraggingRef.current) {
      onDragStateChange(null);
    }

    wasDraggingRef.current = isDragging;
  }, [isDragging, lesson, onDragStateChange]);

  const getLessonColor = (): string => {
    switch (colorScheme) {
      case 'student_level':
        if (lesson.level) {
          const levelKey = Object.keys(studentLevelColors).find(
            key => key.toLowerCase() === lesson.level?.toLowerCase()
          );
          if (levelKey) {
            return studentLevelColors[levelKey];
          }
        }
        return "#EC4899"; // Default pink
        
      case 'category':
        if (lesson.product_category_id) {
          let categoryColor = categoryColors[lesson.product_category_id];
          
          if (!categoryColor) {
            const categoryKey = Object.keys(categoryColors).find(
              key => key.toLowerCase() === lesson.product_category_id?.toLowerCase()
            );
            if (categoryKey) {
              categoryColor = categoryColors[categoryKey];
            }
          }
          
          if (categoryColor) {
            return categoryColor;
          }
        }
        return "#EC4899"; // Default pink
        
      case 'discipline':
      default:
        if (lesson.discipline) {
          let color = disciplineColors[lesson.discipline];
          
          if (!color) {
            const disciplineKey = Object.keys(disciplineColors).find(
              key => key.toLowerCase() === lesson.discipline?.toLowerCase()
            );
            if (disciplineKey) {
              color = disciplineColors[disciplineKey];
            }
          }
          
          return color || "#EC4899";
        }
        return "#EC4899"; // Default pink
    }
  };

  const lessonColor = getLessonColor();

  return (
    <div
      ref={drag}
      className={`w-full h-full p-1.5 md:p-3 text-white rounded-lg cursor-move transition-all duration-150 shadow-sm flex flex-col justify-center ${dimmed ? "opacity-50 grayscale-[30%]" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${lessonColor}CC, ${lessonColor})`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onLessonClick?.(lesson);
      }}
    >
      <div className="flex justify-between items-start gap-1 md:gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-xs font-semibold text-white truncate">
            {lesson.product_name || ""}
          </div>
          {compactMode ? (
            <div className="text-[9px] md:text-xs text-white/90 mt-0.5 md:mt-1 line-clamp-2 overflow-hidden">
              {lesson.discipline && (
                <Badge
                  variant="secondary"
                  className="text-[9px] md:text-xs bg-white/20 text-white border-0 inline-block mr-1 md:mr-2 mb-0.5 md:mb-1"
                >
                  {lesson.discipline}
                </Badge>
              )}
              {studentName && (
                <span className="inline-flex items-center gap-0.5 md:gap-1 text-white/95">
                  <UserIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span className="truncate max-w-[60px] md:max-w-[100px]">{studentName}</span>
                </span>
              )}
            </div>
          ) : (
            // Full mode: Show all info on desktop, hide some on mobile
            <div className="text-[9px] md:text-xs text-white/90 mt-0.5 md:mt-1 flex flex-wrap items-center gap-1 md:gap-2">
              {lesson.discipline && (
                <Badge
                  variant="secondary"
                  className="text-[9px] md:text-xs bg-white/20 text-white border-0"
                >
                  {lesson.discipline}
                </Badge>
              )}
              {studentName && (
                <span className="inline-flex items-center gap-0.5 md:gap-1 text-white/95">
                  <UserIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span className="truncate max-w-[60px] md:max-w-[120px]">{studentName}</span>
                </span>
              )}
              {/* Hide status and duration on mobile, show on desktop */}
              {lesson.lesson_status_name && (
                <Badge
                  variant="outline"
                  className="hidden md:inline-flex text-[9px] md:text-xs bg-white/10 text-white border-white/30"
                >
                  {lesson.lesson_status_name}
                </Badge>
              )}
              <span className="hidden md:inline text-white/90">{lesson.duration} min</span>
            </div>
          )}
        </div>
        {(onEditLesson || onDeleteLesson) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="p-0.5 md:p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
              >
                <MoreVertical className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onLessonClick?.(lesson)}>
                {t("lessons.viewDetails")}
              </DropdownMenuItem>
              {onEditLesson && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditLesson(lesson);
                  }}
                >
                  {t("common.edit")}
                </DropdownMenuItem>
              )}
              {onDeleteLesson && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLesson(lesson.id);
                  }}
                  className="text-red-600"
                >
                  {t("common.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

const DraggableLesson = React.memo(DraggableLessonBase);

// Drop Zone Component
const DropZoneBase: React.FC<{
  time: string;
  instructorId: string;
  isAvailable: boolean;
  isSchoolClosed: boolean;
  conflictReason?: 'other_school' | 'unavailable' | null;
  compactUnavailable?: boolean;
  compactAvailable?: boolean;
  showDragHints?: boolean;
  canDropAtSlot?: (item: DragItem, time: string, instructorId: string) => boolean;
  canCreateAtSlot?: boolean;
  onDrop: (item: DragItem, time: string, instructorId: string) => void;
  onCreateLesson?: (time: string, instructorId: string) => void;
}> = ({
  time,
  instructorId,
  isAvailable,
  isSchoolClosed,
  conflictReason,
  compactUnavailable = false,
  compactAvailable = false,
  showDragHints = false,
  canDropAtSlot,
  canCreateAtSlot,
  onDrop,
  onCreateLesson,
}) => {
  const { t } = useTranslation();
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DRAG_TYPES.LESSON,
    drop: (item: DragItem) => {
      onDrop(item, time, instructorId);
    },
    canDrop: (item: DragItem) => {
      if (isSchoolClosed || !isAvailable) return false;
      if (!canDropAtSlot) return true;
      return canDropAtSlot(item, time, instructorId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleSlotClick = () => {
    if (isSchoolClosed) {
      return; // prevent lesson creation if school is closed
    }
    if (isAvailable && (canCreateAtSlot ?? true) && onCreateLesson) {
      onCreateLesson(time, instructorId);
    }
  };

  return (
    <div
      ref={drop}
      className={`w-full h-full p-1 md:p-2 box-border flex items-center justify-center ${
        isOver && canDrop && !isSchoolClosed ? 'bg-green-200 ring-2 ring-green-500 ring-inset' : ''
      }`}
    >
      {isSchoolClosed ? (
        <div className="w-full h-full p-1.5 md:p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-[10px] md:text-xs text-center flex items-center justify-center">
          <div className="flex flex-col items-center gap-0.5 md:gap-1">
            <X className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-[9px] md:text-xs font-medium">
              {t("calendar.schoolClosed") || "School Closed"}
            </span>
          </div>
        </div>
      ) : isAvailable ? (
        <button
          type="button"
          onClick={handleSlotClick}
          className={`w-full h-full p-1 md:p-2 box-border flex items-center justify-center rounded-lg transition-all duration-200 group ${
            compactAvailable
              ? `text-transparent ${showDragHints ? "border-t border-dashed border-gray-200/80 hover:bg-green-100/60" : "hover:bg-gray-100/70"}`
              : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
          }`}
        >
          {compactAvailable ? (
            showDragHints ? (
              isOver && canDrop ? (
                <span className="text-[9px] md:text-[10px] font-medium text-green-800">
                  {`${t("calendar.dropAt", { defaultValue: "Drop at" })} ${time}`}
                </span>
              ) : (
                <span className="sr-only">{time}</span>
              )
            ) : (
              <span className="sr-only">{t("calendar.addLesson")}</span>
            )
          ) : (
            <div className="flex flex-col items-center gap-0.5 md:gap-1">
              <Plus className="h-4 w-4 md:h-5 md:w-5 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] md:text-xs font-medium">
                {t("calendar.addLesson")}
              </span>
            </div>
          )}
        </button>
      ) : conflictReason === 'other_school' ? (
        <div className="w-full h-full p-1 md:p-2 box-border flex items-center justify-center bg-amber-50 border-2 border-amber-200 rounded-lg text-amber-700 text-[10px] md:text-xs text-center">
          {compactUnavailable ? (
            <Lock className="h-3 w-3 md:h-4 md:w-4" />
          ) : (
            <div className="flex flex-col items-center gap-0.5 md:gap-1">
              <Lock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[9px] md:text-xs font-medium">
                {t("calendar.bookedByOtherSchool", { defaultValue: "Booked by another school" })}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full p-1 md:p-2 box-border flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-[10px] md:text-xs text-center">
          {compactUnavailable ? (
            <X className="h-3 w-3 md:h-4 md:w-4" />
          ) : (
            <div className="flex flex-col items-center gap-0.5 md:gap-1">
              <X className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[9px] md:text-xs">
                {t("calendar.notAvailable")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DropZone = React.memo(DropZoneBase);

const DailyCalendar: React.FC<DailyCalendarProps> = ({
  currentDate,
  onCreateLesson,
  onLessonClick,
  disciplineColors = {},
  visibleInstructorIds = [],
  onDeleteLesson,
  onEditLesson,
  onRescheduleLesson,
  activeDiscipline,
  schoolId: propSchoolId,
  // Bulk data props
  lessons: providedLessons,
  instructors: providedInstructors,
  students: providedStudents,
  availability: providedAvailability,
  specialDates: providedSpecialDates,
  weeklyAvailability: providedWeeklyAvailability,
  conflictLessons = [],
}) => {
  const { t } = useTranslation();
  const { role, permissions } = useUserRole();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const schoolId = propSchoolId || user?.schoolId;
  
  const { school, isLoading: isSchoolLoading } = useSchool(schoolId);
  
  // Fetch school settings for color scheme and slot increment
  const { settings } = useSchoolSettings(schoolId);
  const colorScheme = settings?.lessonColorScheme || 'discipline';
  
  // Fetch student levels and product categories for color mapping
  const { studentLevels } = useStudentLevels(schoolId);
  const { categories } = useProductCategories(schoolId);
  
  // Create color maps
  const studentLevelColors = useMemo(() => {
    return studentLevels.reduce((acc, level) => {
      acc[level.slug] = level.color;
      acc[level.name.toLowerCase()] = level.color; // Also map by name for backward compatibility
      return acc;
    }, {} as Record<string, string>);
  }, [studentLevels]);
  
  const categoryColors = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = category.color;
      return acc;
    }, {} as Record<string, string>);
  }, [categories]);

  const [error, setError] = useState<string>("");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    time: string;
    instructorId: string;
    date: string;
    duration: number;
  } | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<Lesson | null>(null);

  const dateStr = formatDateLocal(currentDate);

  const hasBulkData = providedLessons !== undefined || providedInstructors !== undefined;
  
  const { data: fetchedSpecialDates } = useSpecialDates(
    dateStr,
    dateStr,
    hasBulkData ? undefined : schoolId
  );
  const { data: fetchedWeeklyAvailability } = useWeeklyAvailability(
    hasBulkData ? undefined : schoolId
  );

  const specialDates = providedSpecialDates !== undefined ? providedSpecialDates : fetchedSpecialDates;
  const weeklyAvailability = providedWeeklyAvailability !== undefined ? providedWeeklyAvailability : fetchedWeeklyAvailability;
  
  // check if school is closed on this date
  const isSchoolClosed = useMemo(() => {
    const isAvailable = isDayAvailable(weeklyAvailability, specialDates, currentDate);
    return !isAvailable;
  }, [weeklyAvailability, specialDates, currentDate]);

  // Parse time string to extract hour (handles HH:MM and HH:MM:SS formats)
  const parseHour = (timeStr: string | undefined | null): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const hour = parseInt(parts[0], 10);
    if (isNaN(hour) || hour < 0 || hour > 23) return null;
    return hour;
  };

  const timeSlots = useMemo(() => {
    const startHour = parseHour(school?.openHoursStart) ?? 9;
    const endHour = parseHour(school?.openHoursEnd) ?? 18;
    
    const validStartHour = Math.max(0, Math.min(23, startHour));
    const validEndHour = Math.max(0, Math.min(23, endHour));
    
    const finalStartHour = validStartHour < validEndHour ? validStartHour : 9;
    const finalEndHour = validStartHour < validEndHour ? validEndHour : 18;
    
    const slots = [];
    const increment = GLOBAL_TIME_INCREMENT_MINUTES;
    const dayStartMinutes = finalStartHour * 60;
    const dayEndMinutes = finalEndHour * 60;

    for (let start = dayStartMinutes; start < dayEndMinutes; start += increment) {
      const end = Math.min(start + increment, dayEndMinutes);
      if (end <= start) continue;

      const startHourVal = Math.floor(start / 60);
      const startMinuteVal = start % 60;
      const endHourVal = Math.floor(end / 60);
      const endMinuteVal = end % 60;

      slots.push({
        time: `${startHourVal.toString().padStart(2, "0")}:${startMinuteVal
          .toString()
          .padStart(2, "0")}`,
        endTime: `${endHourVal.toString().padStart(2, "0")}:${endMinuteVal
          .toString()
          .padStart(2, "0")}`,
      });
    }
    return slots;
  }, [school?.openHoursStart, school?.openHoursEnd]);

  const hourSlots = useMemo(() => {
    const startHour = parseHour(school?.openHoursStart) ?? 9;
    const endHour = parseHour(school?.openHoursEnd) ?? 18;
    const validStartHour = Math.max(0, Math.min(23, startHour));
    const validEndHour = Math.max(0, Math.min(23, endHour));
    const finalStartHour = validStartHour < validEndHour ? validStartHour : 9;
    const finalEndHour = validStartHour < validEndHour ? validEndHour : 18;

    const slots: Array<{ time: string; endTime: string }> = [];
    for (let hour = finalStartHour; hour < finalEndHour; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
      });
    }
    return slots;
  }, [school?.openHoursStart, school?.openHoursEnd]);
  const timeSlotSet = useMemo(() => new Set(timeSlots.map((slot) => slot.time)), [timeSlots]);

  const { data: fetchedLessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', dateStr, dateStr, schoolId],
    queryFn: () => lessonsApi.listByRange({
      startDate: dateStr,
      endDate: dateStr,
      limit: 100,
      schoolId: schoolId,
    }),
    enabled: !hasBulkData && !!schoolId,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: fetchedInstructors = [], isLoading: instructorsLoading } = useQuery({
    queryKey: ['instructors', 'daily-calendar', schoolId, user?.role, role],
    queryFn: async () => {
      if (user?.role === UserRole.SUPER_ADMIN && schoolId) {
        const response = await api.get(`/instructors?page=1&limit=100&schoolId=${schoolId}`);
        return response.data.data.instructors || [];
      } else {
        const instructorsData = await roleAwareApi.getInstructors(role, 1, 100);
        return instructorsData.instructors || [];
      }
    },
    enabled: !hasBulkData && !!schoolId && !!user?.role,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: fetchedStudentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', 'daily-calendar', schoolId, user?.role, role],
    queryFn: async () => {
      if (user?.role === UserRole.SUPER_ADMIN && schoolId) {
        return await studentsApi.getStudents(1, 100, "", schoolId);
      } else {
        return await roleAwareApi.getStudents(role, 1, 100);
      }
    },
    enabled: !hasBulkData && permissions.canViewStudents && !!schoolId && !!user?.role,
    staleTime: 60000, // Cache for 1 minute
  });

  const instructorIds = fetchedInstructors.map((i: Instructor) => i.id).join(',');
  const { data: fetchedAvailability = [], isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', 'daily-calendar', dateStr, dateStr, instructorIds],
    queryFn: async () => {
      if (fetchedInstructors.length === 0) return [];
      const availabilityPromises = fetchedInstructors.map((instructor: Instructor) =>
        availabilityApi.getRange(instructor.id, dateStr, dateStr),
      );
      const availabilityResults = await Promise.all(availabilityPromises);
      return availabilityResults.flat();
    },
    enabled: !hasBulkData && fetchedInstructors.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });

  const lessons = providedLessons !== undefined ? providedLessons : fetchedLessons;
  const instructors = providedInstructors !== undefined ? providedInstructors : fetchedInstructors;
  const students = providedStudents !== undefined ? providedStudents : (fetchedStudentsData?.students || []);
  const availability = providedAvailability !== undefined ? providedAvailability : fetchedAvailability;
  const loading = lessonsLoading || instructorsLoading || studentsLoading || availabilityLoading;

  // Build a memoized index for fast lookups by time and instructor
  const lessonsIndex = useMemo(() => {
    const index = new Map<string, Map<string, Lesson[]>>();
    
    const increment = GLOBAL_TIME_INCREMENT_MINUTES;
    for (const lesson of lessons) {
      const startTime = lesson.time.substring(0, 5);
      const duration = lesson.duration || increment;
      const slotsNeeded = Math.ceil(duration / increment);

      const [startHourStr, startMinuteStr] = startTime.split(":");
      const startHour = parseInt(startHourStr, 10);
      const startMinute = parseInt(startMinuteStr, 10);
      const lessonStartMinutes = startHour * 60 + startMinute;

      for (let i = 0; i < slotsNeeded; i++) {
        const slotStartMinutes = lessonStartMinutes + i * increment;
        const slotHour = Math.floor(slotStartMinutes / 60);
        const slotMinute = slotStartMinutes % 60;
        const slotTime = `${slotHour.toString().padStart(2, "0")}:${slotMinute
          .toString()
          .padStart(2, "0")}`;

        if (!index.has(slotTime)) index.set(slotTime, new Map());
        const byInstructor = index.get(slotTime)!;
        const key = lesson.instructor_id;
        if (!byInstructor.has(key)) byInstructor.set(key, []);
        byInstructor.get(key)!.push(lesson);
      }
    }
    return index;
  }, [lessons]);

  // Build a memoized index for conflict lessons (from other schools)
  const conflictsIndex = useMemo(() => {
    const index = new Map<string, Map<string, typeof conflictLessons>>();
    
    const increment = GLOBAL_TIME_INCREMENT_MINUTES;
    for (const conflict of conflictLessons) {
      const startTime = conflict.time.substring(0, 5);
      const duration = conflict.duration || increment;
      const slotsNeeded = Math.ceil(duration / increment);

      const [startHourStr, startMinuteStr] = startTime.split(":");
      const startHour = parseInt(startHourStr, 10);
      const startMinute = parseInt(startMinuteStr, 10);
      const conflictStartMinutes = startHour * 60 + startMinute;

      for (let i = 0; i < slotsNeeded; i++) {
        const slotStartMinutes = conflictStartMinutes + i * increment;
        const slotHour = Math.floor(slotStartMinutes / 60);
        const slotMinute = slotStartMinutes % 60;
        const slotTime = `${slotHour.toString().padStart(2, "0")}:${slotMinute
          .toString()
          .padStart(2, "0")}`;

        if (!index.has(slotTime)) index.set(slotTime, new Map());
        const byInstructor = index.get(slotTime)!;
        const key = conflict.instructor_id;
        if (!byInstructor.has(key)) byInstructor.set(key, []);
        byInstructor.get(key)!.push(conflict);
      }
    }
    return index;
  }, [conflictLessons]);

  const toTotalMinutes = (time: string): number => {
    const [hour, minute] = time.substring(0, 5).split(":").map((value) => parseInt(value, 10));
    if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
    return hour * 60 + minute;
  };

  const toTimeString = (minutes: number): string => {
    const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  // Check if an instructor is available for a single quarter slot.
  const getSlotAvailability = useCallback((instructorId: string, time: string, currentSchoolId?: string, excludeLessonId?: string): {
    available: boolean; 
    conflictReason?: 'other_school' | 'unavailable' | null 
  } => {
    const instructorAvailability = availability.filter(
      (slot) => slot.instructor_id === instructorId && slot.active,
    );

    // Check if the time slot falls within any availability range
    const isAvailable = instructorAvailability.some((slot) => {
      const slotStart = slot.time_start.substring(0, 5); // "09:00:00" -> "09:00"
      const slotEnd = slot.time_end.substring(0, 5); // "17:00:00" -> "17:00"

      // Convert time strings to comparable format
      const timeToCheck = time.padEnd(5, ":00"); // "09:00" -> "09:00"

      return timeToCheck >= slotStart && timeToCheck < slotEnd;
    });

    // check if there are any existing lessons in this slot (from current school)
    const existingLessons = lessonsIndex.get(time)?.get(instructorId) || [];
    const hasConflictingLesson = existingLessons.some((lesson) => lesson.id !== excludeLessonId);

    // check if there are conflicts from other schools
    const conflictLessonsAtTime = conflictsIndex.get(time)?.get(instructorId) || [];
    const hasConflictFromOtherSchool = conflictLessonsAtTime.some((conflict) => {
      // Only count as conflict if it's from a different school
      return !!currentSchoolId && conflict.school_id !== currentSchoolId;
    });

    if (!isAvailable || hasConflictingLesson) {
      return { available: false, conflictReason: 'unavailable' };
    }

    if (hasConflictFromOtherSchool) {
      return { available: false, conflictReason: 'other_school' };
    }

    return { available: true };
  }, [availability, lessonsIndex, conflictsIndex]);

  const isWindowAvailable = useCallback((instructorId: string, startTime: string, duration: number, currentSchoolId?: string, excludeLessonId?: string): {
    available: boolean;
    conflictReason?: 'other_school' | 'unavailable' | null;
  } => {
    const increment = GLOBAL_TIME_INCREMENT_MINUTES;
    const slotsNeeded = Math.max(1, Math.ceil((duration || increment) / increment));
    const startMinutes = toTotalMinutes(startTime);

    for (let i = 0; i < slotsNeeded; i++) {
      const slotTime = toTimeString(startMinutes + i * increment);
      if (!timeSlotSet.has(slotTime)) {
        return { available: false, conflictReason: "unavailable" };
      }

      const slotStatus = getSlotAvailability(instructorId, slotTime, currentSchoolId, excludeLessonId);
      if (!slotStatus.available) {
        return slotStatus;
      }
    }

    return { available: true };
  }, [timeSlotSet, getSlotAvailability]);

  // Check if an instructor is available for a time slot
  // Returns object with availability status and conflict reason
  const isInstructorAvailable = (instructorId: string, time: string, currentSchoolId?: string): { 
    available: boolean; 
    conflictReason?: 'other_school' | 'unavailable' | null 
  } => {
    return getSlotAvailability(instructorId, time, currentSchoolId);
  };

  const canDropLessonAtSlot = useCallback((item: DragItem, time: string, instructorId: string) => {
    if (isSchoolClosed) return false;
    const lesson = item.lesson;
    const targetDuration = lesson.duration || GLOBAL_TIME_INCREMENT_MINUTES;
    return isWindowAvailable(instructorId, time, targetDuration, schoolId, lesson.id).available;
  }, [isSchoolClosed, isWindowAvailable, schoolId]);

  // Handle slot click
  const handleSlotClick = (time: string, instructorId: string) => {
    // check if school is closed on date
    if (isSchoolClosed) {
      setError(t("calendar.errors.schoolClosed") || "School is closed on this date. Cannot create lessons.");
      return;
    }

    // Check if user has permission to create lessons
    if (!permissions.canCreateLessons) {
      setError(t("calendar.errors.noPermissionToCreateLesson"));
      return;
    }

    const slotData = {
      time,
      instructorId,
      date: dateStr,
      // Default new lessons to 1 hour; user can adjust in dialog/wizard.
      duration: 60,
    };

    if (onCreateLesson) {
      onCreateLesson(slotData);
    } else {
      setSelectedSlot(slotData);
      setIsCreateDialogOpen(true);
    }
  };

  // Handle lesson creation
  const handleCreateLesson = async (lessonData: any) => {
    try {
      console.log("Creating lesson:", lessonData);
      console.log("About to call lessonCreationApi.createLesson...");

      // Call the lesson creation API
      const result = await lessonCreationApi.createLesson(lessonData);
      console.log("Lesson creation API response:", result);

      // Close dialog and reset form
      setIsCreateDialogOpen(false);
      setSelectedSlot(null);

      console.log("Refreshing lessons...");
      await queryClient.invalidateQueries({ queryKey: ['lessons', dateStr, dateStr, schoolId] });
    } catch (err: any) {
      console.error("Error creating lesson:", err);
      setError(err?.message || "Failed to create lesson");
    }
  };

  // Handle drag and drop reschedule
  const handleDrop = async (item: DragItem, newTime: string, newInstructorId: string) => {
    if (!onRescheduleLesson) return;

    // Check if school is closed before allowing reschedule
    if (isSchoolClosed) {
      setError(t("calendar.errors.schoolClosed") || "School is closed on this date. Cannot reschedule lessons.");
      return;
    }

    const { lesson } = item;
    
    try {
      await onRescheduleLesson(lesson.id, dateStr, newTime, newInstructorId, lesson.duration);
      
      await queryClient.invalidateQueries({ queryKey: ['lessons', dateStr, dateStr, schoolId] });
    } catch (err: any) {
      console.error("Error rescheduling lesson:", err);
      setError(err?.message || "Failed to reschedule lesson");
    }
  };

  if (loading || isSchoolLoading) {
    const estimatedInstructorCount = Math.max(1, instructors.length || 3);
    const estimatedTimeSlotCount = hourSlots.length > 0 ? hourSlots.length : 10;
    
    return (
      <CalendarSkeleton 
        instructorCount={estimatedInstructorCount}
        timeSlotCount={estimatedTimeSlotCount}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

        {/* Calendar Grid - Instructor-based like prototype */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto" style={{ overflowY: 'hidden' }}>
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `80px repeat(${Math.max(1, instructors.filter((i: any) => i.isActive && (visibleInstructorIds.length === 0 || visibleInstructorIds.includes(i.id))).length)}, minmax(120px, 1fr))`,
              }}
            >
              {/* Time Column Header */}
              <div className="p-2 md:p-4 border-r border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 font-semibold text-[10px] md:text-sm sticky left-0 z-[1] box-border">
                <div className="text-gray-800">Time</div>
              </div>

              {/* Instructor Column Headers */}
              {instructors
                .filter((instructor: any) => instructor.isActive && (
                  visibleInstructorIds.length === 0 || 
                  visibleInstructorIds.includes(instructor.id)
                ))
                .map((instructor: any) => (
                  <div
                    key={instructor.id}
                    className="p-2 md:p-4 border-r border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 font-semibold text-[10px] md:text-sm box-border"
                  >
                    <div className="flex items-center gap-1.5 md:gap-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] md:text-xs font-semibold">
                          {instructor.firstName?.[0]}{instructor.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs md:text-sm text-gray-900 truncate">
                          {instructor.firstName} {instructor.lastName}
                        </div>
                        <div className="hidden md:flex text-xs text-gray-500 truncate flex-wrap gap-1">
                          {instructor.specialties?.map((specialty: any) => (
                            <span
                              key={specialty}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded"
                            >
                              {specialty}
                            </span>
                          )) || "No specialties"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Time Slots and Instructor Columns */}
              {hourSlots.map(({ time, endTime }) => (
                <React.Fragment key={time}>
                  {/* Time Slot */}
                  <div className="p-1.5 md:p-3 border-r border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 text-[10px] md:text-xs font-semibold h-[70px] md:h-[90px] flex items-center justify-center sticky left-0 z-[1] bg-white box-border">
                    <div className="text-center text-gray-700">
                      <div className="hidden md:block">{time}-{endTime}</div>
                      <div className="md:hidden text-[9px] leading-tight">
                        <div>{time.split(':')[0]}:{time.split(':')[1]}</div>
                        <div className="text-[8px]">{endTime.split(':')[0]}:{endTime.split(':')[1]}</div>
                      </div>
                    </div>
                  </div>

                  {/* Instructor Columns for this time slot */}
                  {instructors
                    .filter((instructor: any) => instructor.isActive && (
                      visibleInstructorIds.length === 0 || 
                      visibleInstructorIds.includes(instructor.id)
                    ))
                    .map((instructor: any) => {
                      const hourPrefix = `${time.split(":")[0]}:`;
                      const quarterTimes = timeSlots
                        .map((slot) => slot.time)
                        .filter((slotTime) => slotTime.startsWith(hourPrefix));
                      const quarterTimeSet = new Set(quarterTimes);

                      const hourLessonsRaw = quarterTimes.flatMap(
                        (slotTime) =>
                          lessonsIndex.get(slotTime)?.get(instructor.id) || [],
                      );
                      const dedupedHourLessons = Array.from(
                        new Map(
                          hourLessonsRaw.map((lesson) => [lesson.id, lesson]),
                        ).values(),
                      );

                      const startingLessons = dedupedHourLessons.filter((lesson) => {
                        const lessonTime = lesson.time.substring(0, 5);
                        return quarterTimeSet.has(lessonTime);
                      });

                      const isOccupiedByContinuingLesson = dedupedHourLessons.some(
                        (lesson) => {
                          const lessonTime = lesson.time.substring(0, 5);
                          return !quarterTimeSet.has(lessonTime);
                        },
                      );

                      const quarterAvailability = quarterTimes.map((slotTime) =>
                        isInstructorAvailable(instructor.id, slotTime, schoolId),
                      );
                      // Availability is shown/applied per hour cell (not per quarter cell).
                      const isAvailable = quarterAvailability.every(
                        (status) => status.available,
                      );
                      const hourConflictReason = quarterAvailability.find(
                        (status) => !status.available && status.conflictReason,
                      )?.conflictReason;

                      return (
                        <div 
                          key={`${instructor.id}-${time}`}
                          className="w-full h-[70px] md:h-[90px] p-1 md:p-2 border-r border-b border-gray-200 bg-white relative box-border"
                        >
                          {/* If school is closed, show "School Closed" message instead of lessons */}
                          {isSchoolClosed ? (
                            <div className="w-full h-full p-1.5 md:p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-[10px] md:text-xs text-center flex items-center justify-center">
                              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                <X className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="text-[9px] md:text-xs font-medium">
                                  {t("calendar.schoolClosed") || "School Closed"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full relative">
                              <div className="absolute inset-0 grid grid-rows-4 gap-0 z-[5]">
                                {quarterTimes.map((quarterTime) => {
                                  const createAllowed = isWindowAvailable(
                                    instructor.id,
                                    quarterTime,
                                    GLOBAL_TIME_INCREMENT_MINUTES,
                                    schoolId,
                                  ).available;

                                  return (
                                    <DropZone
                                      key={`${instructor.id}-${quarterTime}`}
                                      isSchoolClosed={isSchoolClosed}
                                      time={quarterTime}
                                      instructorId={instructor.id}
                                      isAvailable={true}
                                      conflictReason={null}
                                      compactUnavailable={true}
                                      compactAvailable={true}
                                      showDragHints={!!draggedLesson}
                                      canDropAtSlot={canDropLessonAtSlot}
                                      canCreateAtSlot={createAllowed}
                                      onDrop={handleDrop}
                                      onCreateLesson={handleSlotClick}
                                    />
                                  );
                                })}
                              </div>

                              {/* Show full lesson cards for lessons that start in this hour */}
                              {startingLessons.length > 0 && (
                                <div
                                  className={`space-y-1 h-full relative z-[15] ${
                                    draggedLesson ? "pointer-events-none" : ""
                                  }`}
                                >
                                  {startingLessons.map((lesson) => {
                                    const studentName = (
                                      lesson.student_first_name && lesson.student_last_name
                                        ? `${lesson.student_first_name} ${lesson.student_last_name}`
                                        : (students.find((s) => s.id === lesson.student_id)?.firstName && students.find((s) => s.id === lesson.student_id)?.lastName
                                            ? `${students.find((s) => s.id === lesson.student_id)!.firstName} ${students.find((s) => s.id === lesson.student_id)!.lastName}`
                                            : undefined)
                                    );
                                    const dimmed = !!activeDiscipline && lesson.discipline !== activeDiscipline;

                                    // Calculate how many grid rows this lesson should span
                                    const incrementMinutes = GLOBAL_TIME_INCREMENT_MINUTES;
                                    const safeIncrement = incrementMinutes > 0 ? incrementMinutes : 60;
                                    const rowSpan = Math.max(
                                      1,
                                      Math.ceil(lesson.duration / safeIncrement),
                                    );

                                    // determine if we should use compact mode i.e more than 5 instructors and 1hour lesson
                                    const activeInstructorsCount = instructors.filter((i: any) => i.isActive && (visibleInstructorIds.length === 0 || visibleInstructorIds.includes(i.id))).length;
                                    const compactMode = activeInstructorsCount >= 5 && lesson.duration === 60;

                                    // Mobile height is 70px, desktop is 90px
                                    const mobileCellHeight = 70;
                                    const desktopCellHeight = 90;
                                    const mobileQuarterHeight =
                                      mobileCellHeight / (60 / GLOBAL_TIME_INCREMENT_MINUTES);
                                    const desktopQuarterHeight =
                                      desktopCellHeight / (60 / GLOBAL_TIME_INCREMENT_MINUTES);
                                    const startMinute =
                                      parseInt(lesson.time.substring(3, 5), 10) || 0;
                                    const quarterOffset =
                                      (startMinute % 60) / GLOBAL_TIME_INCREMENT_MINUTES;
                                    const mobileTopOffset = 4 + quarterOffset * mobileQuarterHeight;
                                    const desktopTopOffset = 4 + quarterOffset * desktopQuarterHeight;
                                    const mobileLessonHeight =
                                      rowSpan * mobileQuarterHeight - 4;
                                    const desktopLessonHeight =
                                      rowSpan * desktopQuarterHeight - 4;

                                    return (
                                      <div
                                        key={lesson.id}
                                        className="absolute z-[15]"
                                        style={{
                                          '--desktop-height': `${desktopLessonHeight}px`,
                                          '--desktop-top': `${desktopTopOffset}px`,
                                          height: `${mobileLessonHeight}px`,
                                          width: 'calc(100% - 8px)',
                                          top: `${mobileTopOffset}px`,
                                          left: '4px',
                                        } as LessonCardStyle}
                                      >
                                        <DraggableLesson
                                          lesson={lesson}
                                          disciplineColors={disciplineColors}
                                          onLessonClick={onLessonClick}
                                          onDeleteLesson={onDeleteLesson}
                                          onEditLesson={onEditLesson}
                                          onDragStateChange={setDraggedLesson}
                                          dimmed={dimmed}
                                          studentName={studentName}
                                          colorScheme={colorScheme}
                                          studentLevelColors={studentLevelColors}
                                          categoryColors={categoryColors}
                                          compactMode={compactMode}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {!isAvailable &&
                                startingLessons.length === 0 &&
                                !isOccupiedByContinuingLesson && (
                                <div className="absolute inset-0 z-[8] pointer-events-none w-full h-full p-1 md:p-2 box-border flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-[10px] md:text-xs text-center">
                                  <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                    {hourConflictReason === "other_school" ? (
                                      <>
                                        <Lock className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                                        <span className="text-[9px] md:text-xs text-amber-700 font-medium">
                                          {t("calendar.bookedByOtherSchool", {
                                            defaultValue: "Booked by another school",
                                          })}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-3 w-3 md:h-4 md:w-4" />
                                        <span className="text-[9px] md:text-xs">
                                          {t("calendar.notAvailable")}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                              {isAvailable && !isOccupiedByContinuingLesson && startingLessons.length === 0 && (
                                <div className="absolute inset-0 z-[8] pointer-events-none flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-0.5 md:gap-1 text-gray-600">
                                    <Plus className="h-4 w-4 md:h-5 md:w-5" />
                                    <span className="text-[9px] md:text-xs font-medium">
                                      {t("calendar.addLesson")}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

      {/* Create Lesson Dialog - New Implementation */}
      <LessonCreationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        selectedSlot={selectedSlot || undefined}
        currentDate={currentDate}
        instructors={instructors}
        students={students}
        onCreateLesson={handleCreateLesson}
      />
    </div>
  );
};

export default DailyCalendar;
