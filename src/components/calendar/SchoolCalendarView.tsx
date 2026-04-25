import React, { useMemo, useState } from "react";
import { isDayAvailable, WeeklyAvailability, SpecialDate } from "@/hooks/useSchoolCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, CalendarDays, MousePointerClick, BadgeCheck, Lock, Eye, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

type SelectionMode = "single" | "multiple" | "range";

interface SchoolCalendarViewProps {
  weekly: WeeklyAvailability[] | undefined;
  specials: SpecialDate[] | undefined;
  onUpsert: (items: SpecialDate[]) => Promise<void>;
  refetchWeekly: () => Promise<any>;
  refetchSpecials: () => Promise<any>;
  schoolName?: string;
}

const SchoolCalendarView: React.FC<SchoolCalendarViewProps> = ({
  weekly,
  specials,
  onUpsert,
  refetchWeekly,
  refetchSpecials,
  schoolName,
}) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState(new Date());
  const [mode, setMode] = useState<SelectionMode>("single");
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const eachDayBetween = (start: Date, end: Date) => {
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    return days;
  };

  const daysInMonth = useMemo(
    () => eachDayBetween(startOfMonth(anchor), endOfMonth(anchor)),
    [anchor],
  );

  const openClosedCount = useMemo(() => {
    let open = 0;
    let closed = 0;
    for (const d of daysInMonth) {
      if (isDayAvailable(weekly, specials, d)) open++;
      else closed++;
    }
    return { open, closed };
  }, [daysInMonth, weekly, specials]);

  const handleDayClick = (day: Date) => {
    if (mode === "single") {
      const current = isDayAvailable(weekly, specials, day);
      onUpsert([{ date: format(day, "yyyy-MM-dd"), is_available: !current }]);
    } else if (mode === "multiple") {
      setSelectedDays((prev) => {
        const exists = prev.some((d) => isSameDay(d, day));
        if (exists) {
          return prev.filter((d) => !isSameDay(d, day));
        } else {
          return [...prev, day];
        }
      });
    } else if (mode === "range") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(day);
        setRangeEnd(undefined);
        setSelectedDays([]);
      } else if (rangeStart && !rangeEnd) {
        const start = rangeStart < day ? rangeStart : day;
        const end = rangeStart < day ? day : rangeStart;
        setRangeEnd(day);
        const rangeDays = eachDayBetween(start, end);
        setSelectedDays(rangeDays);
      }
    }
  };

  const applySelection = async (isAvailable: boolean) => {
    if (selectedDays.length === 0) return;
    setIsRefreshing(true);
    try {
      const items = selectedDays.map((d) => ({
        date: format(d, "yyyy-MM-dd"),
        is_available: isAvailable,
      }));
      await onUpsert(items);
      await Promise.all([refetchWeekly(), refetchSpecials()]);
      setSelectedDays([]);
      setRangeStart(undefined);
      setRangeEnd(undefined);
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearSelection = () => {
    setSelectedDays([]);
    setRangeStart(undefined);
    setRangeEnd(undefined);
  };

  const selectThisWeek = () => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 });
    const e = endOfWeek(new Date(), { weekStartsOn: 1 });
    setSelectedDays(eachDayBetween(s, e));
    setRangeStart(undefined);
    setRangeEnd(undefined);
    setMode("multiple");
  };

  const selectThisMonth = () => {
    const s = startOfMonth(anchor);
    const e = endOfMonth(anchor);
    setSelectedDays(eachDayBetween(s, e));
    setRangeStart(undefined);
    setRangeEnd(undefined);
    setMode("multiple");
  };

  const selectMonthWeekends = () => {
    const weekends = daysInMonth.filter((d) => [0, 6].includes(d.getDay()));
    setSelectedDays(weekends);
    setRangeStart(undefined);
    setRangeEnd(undefined);
    setMode("multiple");
  };

  // reset selection when mode changes
  React.useEffect(() => {
    setSelectedDays([]);
    setRangeStart(undefined);
    setRangeEnd(undefined);
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <CalendarIcon className="h-6 w-6 text-gray-700" />
          <span>{schoolName ? `${schoolName} - ${t("schoolCalendar.title")}` : t("schoolCalendar.title")}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("schoolCalendar.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg sm:text-xl">{t("schoolCalendar.title")}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("schoolCalendar.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 sm:px-3 py-1 text-green-700 border border-green-200">
                {openClosedCount.open} {t("schoolCalendar.open")}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 sm:px-3 py-1 text-gray-700 border border-gray-200">
                {openClosedCount.closed} {t("schoolCalendar.closed")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-gray-50/50 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
              <div className="text-sm font-medium flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-gray-600" />
                <span>{t("schoolCalendar.mode")}:</span>
              </div>
              <Select
                value={mode}
                onValueChange={(value: SelectionMode) => setMode(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t("schoolCalendar.singleClick")}</SelectItem>
                  <SelectItem value="multiple">{t("schoolCalendar.multipleSelection")}</SelectItem>
                  <SelectItem value="range">{t("schoolCalendar.periodRange")}</SelectItem>
                </SelectContent>
              </Select>

              {(mode === "multiple" || mode === "range") && selectedDays.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => applySelection(false)}
                    className="gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {t("schoolCalendar.closeSelected")} ({selectedDays.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => applySelection(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {t("schoolCalendar.openSelected")} ({selectedDays.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t("common.clear")}
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
              <span className="text-sm">{t("schoolCalendar.quickSelections")}:</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={selectThisWeek} className="text-xs sm:text-sm">
                  <CalendarDays className="mr-2 h-4 w-4" /> {t("schoolCalendar.thisWeek")}
                </Button>
                <Button size="sm" variant="secondary" onClick={selectThisMonth} className="text-xs sm:text-sm">
                  <CalendarDays className="mr-2 h-4 w-4" /> {t("schoolCalendar.thisMonth")}
                </Button>
                <Button size="sm" variant="secondary" onClick={selectMonthWeekends} className="text-xs sm:text-sm">
                  <CalendarDays className="mr-2 h-4 w-4" /> {t("schoolCalendar.monthWeekends")}
                </Button>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {mode === "single" && t("schoolCalendar.singleClickHelp")}
              {mode === "multiple" && t("schoolCalendar.multipleSelectionHelp")}
              {mode === "range" && t("schoolCalendar.periodRangeHelp")}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-pink-500" /> {t("schoolCalendar.selectedDay")}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-red-500" /> {t("schoolCalendar.schoolClosed")}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-gray-200 border" /> {t("schoolCalendar.schoolOpen")}
              </div>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto">
            <div className="inline-block relative min-w-full sm:min-w-0">
              {/* Loading Overlay */}
              {isRefreshing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
                    <p className="text-sm font-medium text-gray-700">{t("schoolCalendar.refreshingCalendar")}</p>
                  </div>
                </div>
              )}
              <div className="border rounded-lg p-3 sm:p-6 bg-white shadow-sm w-full sm:w-auto">
                {/* month Navigation i.e prev / next*/}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setAnchor(addDays(startOfMonth(anchor), -1))}
                    className="h-8 w-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold capitalize">
                    {format(anchor, "MMMM yyyy")}
                  </h2>
                  <button
                    onClick={() => setAnchor(addDays(endOfMonth(anchor), 1))}
                    className="h-8 w-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                {/* Calendar */}
                <div className="space-y-1 sm:space-y-2">
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day: string) => (
                      <div
                        key={day}
                        className="h-8 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-600"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  {(() => {
                    const monthStart = startOfMonth(anchor);
                    const monthEnd = endOfMonth(anchor);
                    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                    const days = eachDayOfInterval({ start: startDate, end: endDate });
                    const weeks: Date[][] = [];

                    for (let i = 0; i < days.length; i += 7) {
                      weeks.push(days.slice(i, i + 7));
                    }

                    return weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
                        {week.map((day) => {
                          const isCurrentMonth = day.getMonth() === anchor.getMonth();
                          const isAvailable = isDayAvailable(weekly, specials, day);
                          const isSelected = selectedDays.some((d) => isSameDay(d, day));
                          const isToday = isSameDay(day, new Date());

                          return (
                            <button
                              key={day.toISOString()}
                              onClick={() => handleDayClick(day)}
                              className={`
                                h-8 w-8 sm:h-10 sm:w-10 rounded-md text-xs sm:text-sm font-normal transition-all
                                ${!isCurrentMonth ? "text-gray-300 bg-white" : ""}
                                ${
                                  isCurrentMonth && isSelected && isAvailable
                                    ? "bg-pink-500 text-white font-medium hover:bg-pink-600"
                                    : ""
                                }
                                ${
                                  isCurrentMonth && !isAvailable
                                    ? "bg-red-500 text-white font-medium hover:bg-red-600"
                                    : ""
                                }
                                ${
                                  isCurrentMonth &&
                                  isAvailable &&
                                  !isSelected &&
                                  !isToday
                                    ? "bg-white text-gray-900 hover:bg-blue-500 hover:text-white"
                                    : ""
                                }
                                ${
                                  isCurrentMonth &&
                                  isAvailable &&
                                  !isSelected &&
                                  isToday
                                    ? "bg-white text-blue-600 font-semibold hover:bg-blue-500 hover:text-white"
                                    : ""
                                }
                              `}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolCalendarView;

