import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AvailabilityDayView from "@/components/instructor/AvailabilityDayView";
import AvailabilityWeekView from "@/components/instructor/AvailabilityWeekView";
import AvailabilityMonthView from "@/components/instructor/AvailabilityMonthView";
import AvailabilityYearView from "@/components/instructor/AvailabilityYearView";

type ViewMode = "day" | "week" | "month" | "year";

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

const InstructorAvailability: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const navigateDate = (dir: "prev" | "next") => {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + (dir === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
    } else if (viewMode === "month") {
      d.setMonth(d.getMonth() + (dir === "next" ? 1 : -1));
    } else if (viewMode === "year") {
      d.setFullYear(d.getFullYear() + (dir === "next" ? 1 : -1));
    }
    setCurrentDate(d);
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            {t("availability.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            {t("availability.manageAvailabilityDescription", { defaultValue: "Manage your availability schedule" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentDate(new Date());
              setViewMode("day");
            }}
            className="h-8 px-3 hover:bg-gray-200"
          >
            {t("availability.today", { defaultValue: "Today" })}
          </Button>
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("availability.dayView", { defaultValue: "Day View" })}</SelectItem>
              <SelectItem value="week">{t("availability.weekView", { defaultValue: "Week View" })}</SelectItem>
              <SelectItem value="month">{t("availability.monthView", { defaultValue: "Month View" })}</SelectItem>
              <SelectItem value="year">{t("availability.yearView", { defaultValue: "Year View" })}</SelectItem>
            </SelectContent>
          </Select>
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
            ) : viewMode === "month" ? (
              currentDate.toLocaleDateString(i18n.language, {
                year: "numeric",
                month: "long",
              })
            ) : (
              currentDate.toLocaleDateString(i18n.language, {
                year: "numeric",
              })
            )}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateDate("next")} className="hover:bg-gray-50 hover:border-gray-300">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === "month" ? (
        <AvailabilityMonthView
          currentDate={currentDate}
          onDateClick={handleDateClick}
        />
      ) : viewMode === "year" ? (
        <AvailabilityYearView
          currentDate={currentDate}
          onDateClick={handleDateClick}
        />
      ) : viewMode === "day" ? (
        <AvailabilityDayView currentDate={currentDate} />
      ) : (
        <AvailabilityWeekView weekDays={weekDays} />
      )}
    </div>
  );
};

export default InstructorAvailability;

