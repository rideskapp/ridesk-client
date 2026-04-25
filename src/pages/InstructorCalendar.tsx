import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { lessonsApi } from "@/services/lessons";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import InstructorCalendarGrid from "@/components/instructor/InstructorCalendarGrid";
import WeeklyCalendarGrid from "@/components/instructor/WeeklyCalendarGrid";
import MonthlyCalendarGrid from "@/components/instructor/MonthlyCalendarGrid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { ALL_SCHOOLS_ID } from "@/types";
type ViewMode = "day" | "week" | "month";

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  date.setDate(date.getDate() + diff);
  return date;
};

const addDays = (d: Date, num: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + num);
  return date;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const InstructorCalendar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { instructorSelectedSchoolId } = useSchoolSelectionStore();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const monthRange = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { start: isoDate(first), end: isoDate(last) };
  }, [currentDate]);

  const { data: monthLessons = [] } = useQuery({
    queryKey: ['instructor-lessons', monthRange.start, monthRange.end, user?.id, instructorSelectedSchoolId],
    queryFn: () => lessonsApi.listByRange({
      startDate: monthRange.start,
      endDate: monthRange.end,
      limit: 500,
      schoolId: (instructorSelectedSchoolId && instructorSelectedSchoolId !== ALL_SCHOOLS_ID) ? instructorSelectedSchoolId : undefined,
    }),
    enabled: viewMode === "month" && !!user?.id,
    staleTime: 60000, // 1 minute
  });

  const monthLessonsIndex = useMemo(() => {
    const index: Record<string, number> = {};
    for (const l of monthLessons) {
      index[l.date] = (index[l.date] || 0) + 1;
    }
    return index;
  }, [monthLessons]);

  const navigateDate = (dir: "prev" | "next") => {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + (dir === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
    } else {
      d.setMonth(d.getMonth() + (dir === "next" ? 1 : -1));
    }
    setCurrentDate(d);
  };

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            {t("navigation.calendar")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            {t("calendar.instructorDescription", { defaultValue: "View your scheduled lessons" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setCurrentDate(new Date());
              setViewMode("day");
            }}
            className={`h-8 px-3 ${viewMode === "day" ? "bg-pink-600 text-white" : "hover:bg-gray-200"}`}
          >
            {t("calendar.today")}
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className={`h-8 px-3 ${viewMode === "week" ? "bg-pink-600 text-white" : "hover:bg-gray-200"}`}
          >
            {t("calendar.week")}
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("month")}
            className={`h-8 px-3 ${viewMode === "month" ? "bg-pink-600 text-white" : "hover:bg-gray-200"}`}
          >
            {t("calendar.month")}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigateDate("prev")} className="hover:bg-gray-50 hover:border-gray-300">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg flex-1 justify-center border border-gray-200">
          <CalendarIcon className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {viewMode === "week" ? (
              <>
                {weekDays[0].toLocaleDateString(i18n.language, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {weekDays[6].toLocaleDateString(i18n.language, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            ) : viewMode === "day" ? (
              currentDate.toLocaleDateString(i18n.language, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            ) : (
              currentDate.toLocaleDateString(i18n.language, {
                year: "numeric",
                month: "long",
              })
            )}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateDate("next")} className="hover:bg-gray-50 hover:border-gray-300">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === "month" ? (
        <MonthlyCalendarGrid
          currentDate={currentDate}
          lessonsByDate={monthLessonsIndex}
          onDateClick={(date) => {
            setCurrentDate(date);
            setViewMode("day");
          }}
        />
      ) : viewMode === "day" ? (
        <InstructorCalendarGrid currentDate={currentDate} schoolId={(instructorSelectedSchoolId && instructorSelectedSchoolId !== ALL_SCHOOLS_ID) ? instructorSelectedSchoolId : undefined} />
      ) : (
        <WeeklyCalendarGrid weekDays={weekDays} schoolId={(instructorSelectedSchoolId && instructorSelectedSchoolId !== ALL_SCHOOLS_ID) ? instructorSelectedSchoolId : undefined} />
      )}
    </div>
    </DndProvider>
  );
};

export default InstructorCalendar;



