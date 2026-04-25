import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { useSchool } from "@/hooks/useSchool";
import {
  getSchoolHourBounds,
  generateTimeSlots,
} from "@/utils/dateHelpers";
import { availabilityApi, AvailabilitySlot } from "@/services/availability";
import { Plus, X } from "lucide-react";

interface AvailabilityWeekViewProps {
  weekDays: Date[];
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];
const AVAILABILITY_BLOCK_MINUTES = 60;

const addMinutes = (time: string, minutesToAdd: number): string => {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  const dayMinutes = 24 * 60;
  const total = h * 60 + m + minutesToAdd;
  const wrappedTotal =
    ((total % dayMinutes) + dayMinutes) % dayMinutes;
  const hh = String(Math.floor(wrappedTotal / 60)).padStart(2, "0");
  const mm = String(wrappedTotal % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const AvailabilityWeekView: React.FC<AvailabilityWeekViewProps> = ({
  weekDays,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { instructorSelectedSchoolId } = useSchoolSelectionStore();
  const schoolId = instructorSelectedSchoolId || user?.schoolId;
  const { school } = useSchool(schoolId);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const isDraggingRef = useRef(false);

  const weekStart = useMemo(() => isoDate(weekDays[0]), [weekDays]);
  const weekEnd = useMemo(() => isoDate(weekDays[6]), [weekDays]);

  // Always check school open/close first, fallback to 9/18 when missing or invalid
  const timeSlots = useMemo(() => {
    const { startHour, endHour } = getSchoolHourBounds(
      school?.openHoursStart,
      school?.openHoursEnd,
    );
    return generateTimeSlots(startHour, endHour).map(
      (s) => ({
      time: s.start,
      endTime: s.end,
      }),
    );
  }, [
    school?.openHoursStart,
    school?.openHoursEnd,
  ]);

  const { data: availability = [], isLoading: loading } = useQuery({
    queryKey: ["instructor-availability", user?.id, weekStart, weekEnd],
    queryFn: () => availabilityApi.getRange(user!.id, weekStart, weekEnd),
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  const availabilityIndex = useMemo(() => {
    const index = new Map<string, AvailabilitySlot[]>();
    for (const a of availability) {
      const dateStr = a.date;
      const arr = index.get(dateStr) || [];
      arr.push(a);
      index.set(dateStr, arr);
    }
    return index;
  }, [availability]);

  const availabilityCovering = useCallback((
    dateStr: string,
    time: string,
  ): AvailabilitySlot | undefined => {
    const dayAvailability = availabilityIndex.get(dateStr) || [];
    const t = time.padEnd(5, ":00");
    return dayAvailability.find(
      (a) =>
        a.active &&
        t >= a.time_start.substring(0, 5) &&
        t < a.time_end.substring(0, 5),
    );
  }, [availabilityIndex]);

  const allWeekSelected = useMemo(() => {
    if (!timeSlots || timeSlots.length === 0) return false;
    return weekDays.every((day) => {
      const dateStr = isoDate(day);
      return timeSlots.every(({ time }) => !!availabilityCovering(dateStr, time));
    });
  }, [weekDays, timeSlots, availabilityCovering]);

  const handleSlotClick = async (dateStr: string, time: string) => {
    if (!user?.id || loadingSlots.has(`${dateStr}-${time}`)) return;
    const slot = availabilityCovering(dateStr, time);
    const slotKey = `${dateStr}-${time}`;

    try {
      setLoadingSlots((prev) => {
        const next = new Set(prev);
        next.add(slotKey);
        return next;
      });
      if (slot) {
        await availabilityApi.remove(slot.id);
      } else {
        const startTime = time;
        const endTime = addMinutes(time, AVAILABILITY_BLOCK_MINUTES);
        await availabilityApi.add({
          instructorId: user.id,
          date: dateStr,
          timeStart: startTime,
          timeEnd: endTime,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["instructor-availability", user.id, weekStart, weekEnd],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update availability");
    } finally {
      setLoadingSlots((prev) => {
        const next = new Set(prev);
        next.delete(slotKey);
        return next;
      });
    }
  };

  const handleDayToggle = async (dateStr: string) => {
    if (!user?.id) return;

    const allAvailable = timeSlots.every(
      ({ time }) => !!availabilityCovering(dateStr, time),
    );

    const affectedSlots = timeSlots.map(({ time }) => `${dateStr}-${time}`);
    setLoadingSlots((prev) => {
      const next = new Set(prev);
      for (const slot of affectedSlots) {
        next.add(slot);
      }
      return next;
    });

    try {
      if (allAvailable) {
        const daySlots = availabilityIndex.get(dateStr) || [];
        const activeSlots = daySlots.filter((a) => a.active);
        await Promise.all(
          activeSlots.map((slot) => availabilityApi.remove(slot.id)),
        );
      } else {
        const promises = timeSlots
          .filter(({ time }) => !availabilityCovering(dateStr, time))
          .map(({ time }) => {
            const startTime = time;
            const endTime = addMinutes(time, AVAILABILITY_BLOCK_MINUTES);
            return availabilityApi.add({
              instructorId: user.id,
              date: dateStr,
              timeStart: startTime,
              timeEnd: endTime,
            });
          });
        await Promise.all(promises);
      }
      await queryClient.invalidateQueries({
        queryKey: ["instructor-availability", user.id, weekStart, weekEnd],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update availability");
    } finally {
      setLoadingSlots((prev) => {
        const next = new Set(prev);
        for (const slot of affectedSlots) {
          next.delete(slot);
        }
        return next;
      });
    }
  };

  const handleTimeRowToggle = async (time: string) => {
    if (!user?.id) return;

    const allAvailable = weekDays.every((day) => {
      const dateStr = isoDate(day);
      return !!availabilityCovering(dateStr, time);
    });

    const affectedSlots = weekDays.map((day) => {
      const dateStr = isoDate(day);
      return `${dateStr}-${time}`;
    });
    setLoadingSlots((prev) => {
      const next = new Set(prev);
      for (const slot of affectedSlots) {
        next.add(slot);
      }
      return next;
    });

    try {
      if (allAvailable) {
        const promises = weekDays.map((day) => {
          const dateStr = isoDate(day);
          const slot = availabilityCovering(dateStr, time);
          if (slot) {
            return availabilityApi.remove(slot.id);
          }
          return Promise.resolve();
        });
        await Promise.all(promises.filter((p) => p !== Promise.resolve()));
      } else {
        const promises = weekDays
          .filter((day) => {
            const dateStr = isoDate(day);
            return !availabilityCovering(dateStr, time);
          })
          .map((day) => {
            const dateStr = isoDate(day);
            const startTime = time;
            const endTime = addMinutes(time, AVAILABILITY_BLOCK_MINUTES);
            return availabilityApi.add({
              instructorId: user.id,
              date: dateStr,
              timeStart: startTime,
              timeEnd: endTime,
            });
          });
        await Promise.all(promises);
      }
      await queryClient.invalidateQueries({
        queryKey: ["instructor-availability", user.id, weekStart, weekEnd],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update availability");
    } finally {
      setLoadingSlots((prev) => {
        const next = new Set(prev);
        for (const slot of affectedSlots) {
          next.delete(slot);
        }
        return next;
      });
    }
  };

  const handleSelectAll = async () => {
    if (!user?.id) return;

    const affectedSlots: string[] = [];
    weekDays.forEach((day) => {
      const dateStr = isoDate(day);
      timeSlots.forEach(({ time }) => {
        affectedSlots.push(`${dateStr}-${time}`);
      });
    });

    setLoadingSlots((prev) => {
      const next = new Set(prev);
      for (const slot of affectedSlots) {
        next.add(slot);
      }
      return next;
    });

    try {
      if (allWeekSelected) {
        // Unselect all (only visible grid)
        const visibleSlotIds = new Set<string>();
        for (const day of weekDays) {
          const dateStr = isoDate(day);
          for (const { time } of timeSlots) {
            const slot = availabilityCovering(dateStr, time);
            if (slot) {
              visibleSlotIds.add(slot.id);
            }
          }
        }
        await Promise.all(
          Array.from(visibleSlotIds).map((id) => availabilityApi.remove(id)),
        );
      } else {
        // Select all
        const promises = [];
        for (const day of weekDays) {
          const dateStr = isoDate(day);
          for (const { time } of timeSlots) {
            if (!availabilityCovering(dateStr, time)) {
              const startTime = time;
              const endTime = addMinutes(time, AVAILABILITY_BLOCK_MINUTES);
              promises.push(
                availabilityApi.add({
                  instructorId: user.id,
                  date: dateStr,
                  timeStart: startTime,
                  timeEnd: endTime,
                }),
              );
            }
          }
        }
        await Promise.all(promises);
      }
      await queryClient.invalidateQueries({
        queryKey: ["instructor-availability", user.id, weekStart, weekEnd],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update availability");
    } finally {
      setLoadingSlots((prev) => {
        const next = new Set(prev);
        for (const slot of affectedSlots) {
          next.delete(slot);
        }
        return next;
      });
    }
  };

  const handleSlotMouseDown = (dateStr: string, time: string) => {
    setSelectedSlots(new Set([`${dateStr}|${time}`]));
    isDraggingRef.current = true;
  };

  const handleSlotMouseEnter = (dateStr: string, time: string) => {
    if (isDraggingRef.current) {
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        next.add(`${dateStr}|${time}`);
        return next;
      });
    }
  };

  const handleMouseUp = useCallback(async () => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;

    if (wasDragging && selectedSlots.size > 1 && user?.id) {
      try {
        const slotMap = new Map<string, { dateStr: string; time: string }>();

        Array.from(selectedSlots).forEach((slotKey) => {
          const lastSeparatorIndex = slotKey.lastIndexOf("|");
          const dateStr = slotKey.substring(0, lastSeparatorIndex);
          const time = slotKey.substring(lastSeparatorIndex + 1);
          const uniqueKey = `${dateStr}|${time}`;
          slotMap.set(uniqueKey, { dateStr, time });
        });

        const removes: Promise<any>[] = [];
        const adds: {
          instructorId: string;
          date: string;
          timeStart: string;
          timeEnd: string;
        }[] = [];
        const uniqueAddKeys = new Set<string>();

        slotMap.forEach(({ dateStr, time }) => {
          const slot = availabilityCovering(dateStr, time);
          if (slot) {
            removes.push(availabilityApi.remove(slot.id));
          } else {
            const addKey = `${dateStr}|${time}`;
            if (!uniqueAddKeys.has(addKey)) {
              uniqueAddKeys.add(addKey);
              const startTime = time;
              const endHour = parseInt(time.split(":")[0], 10) + 1;
              const endTime = `${endHour.toString().padStart(2, "0")}:00`;
              adds.push({
                instructorId: user.id,
                date: dateStr,
                timeStart: startTime,
                timeEnd: endTime,
              });
            }
          }
        });

        if (removes.length > 0) {
          await Promise.all(removes);
        }

        if (adds.length > 0) {
          await Promise.all(adds.map((add) => availabilityApi.add(add)));
        }

        await queryClient.invalidateQueries({
          queryKey: ["instructor-availability", user.id, weekStart, weekEnd],
        });
      } catch (e: any) {
        setError(e?.message || "Failed to update availability");
      }
    }
    setSelectedSlots(new Set());
  }, [
    selectedSlots,
    user?.id,
    weekStart,
    weekEnd,
    availabilityCovering,
    queryClient,
  ]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: `80px repeat(7, minmax(60px, 1fr))` }}
          >
            <div className="p-2 md:p-3 border-r border-b-2 border-gray-300 bg-gray-50 sticky left-0 z-[2] box-border">
              <div className="h-3 md:h-4 w-10 md:w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
            {weekDays.map((_day, index) => (
              <div
                key={`skeleton-header-${index}`}
                className="p-1.5 md:p-3 border-r border-b-2 border-gray-300 bg-gray-50 box-border"
              >
                <div className="space-y-0.5 md:space-y-1">
                  <div className="h-2.5 md:h-3 w-8 md:w-10 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  <div className="h-5 w-5 md:h-8 md:w-8 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
                </div>
              </div>
            ))}
            {timeSlots.map(({ time }) => (
              <React.Fragment key={time}>
                <div className="p-1.5 md:p-2 border-r border-b border-gray-200 bg-white h-[70px] md:h-[90px] flex items-center justify-center sticky left-0 z-[1] text-gray-700 box-border">
                  <div className="h-2.5 md:h-3 w-12 md:w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
                {weekDays.map((_day, dayIndex) => (
                  <div
                    key={`skeleton-${time}-${dayIndex}`}
                    className="w-full h-[70px] md:h-[90px] p-1 md:p-2 border-r border-b border-gray-200 bg-white box-border"
                  >
                    <div className="w-full h-full p-1 md:p-2 rounded-lg bg-gray-50 animate-pulse"></div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        {/* Legend & Controls */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700">
                {t("availability.available", { defaultValue: "Available" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-700">
                {t("availability.notAvailable", {
                  defaultValue: "Not Available",
                })}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {t("availability.clickInstructions", {
                defaultValue:
                  "Click: single slot • Drag: multiple slots • Header: toggle day/time",
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${allWeekSelected
              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
              }`}
          >
            {allWeekSelected
              ? t("availability.unselectAll", { defaultValue: "Unselect All" })
              : t("availability.selectAll", { defaultValue: "Select All" })}
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `80px repeat(7, minmax(60px, 1fr))`,
              }}
            >
              <button
                type="button"
                onClick={handleSelectAll}
                className={`p-2 md:p-3 border-r border-b-2 border-gray-300 bg-gray-50 font-semibold text-[10px] md:text-xs text-center text-gray-600 sticky left-0 z-[2] box-border hover:bg-gray-100 transition-colors ${allWeekSelected ? "bg-green-50 text-green-700" : ""
                  }`}
                title={t("availability.toggleAll", {
                  defaultValue: "Toggle all slots for the week",
                })}
              >
                <div>{t("calendar.time")}</div>
                <div className="text-[8px] mt-0.5 opacity-70">
                  {allWeekSelected
                    ? t("availability.all", { defaultValue: "ALL" })
                    : t("availability.none", { defaultValue: "NONE" })}
                </div>
              </button>

              {weekDays.map((day) => {
                const dateStr = isoDate(day);
                const dayName = day
                  .toLocaleDateString(i18n.language, { weekday: "short" })
                  .toUpperCase();
                const dayNumber = day.getDate();
                const today = isToday(day);
                const daySlots = timeSlots;
                const availableCount = daySlots.filter(({ time }) => !!availabilityCovering(dateStr, time)).length;
                const allDayAvailable = availableCount === daySlots.length;
                const partialDayAvailable = availableCount > 0 && availableCount < daySlots.length;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDayToggle(dateStr)}
                    className={`p-1.5 md:p-3 border-r border-b-2 border-gray-300 bg-gray-50 font-semibold text-[9px] md:text-xs text-center text-gray-600 uppercase hover:bg-gray-100 transition-colors box-border ${today ? "bg-blue-50 hover:bg-blue-100" : ""
                      } ${allDayAvailable ? "bg-green-50 text-green-700" : ""} ${partialDayAvailable ? "bg-yellow-50 text-yellow-700" : ""
                      }`}
                    title={t("availability.clickDayHeader", {
                      defaultValue: "Click to toggle entire day",
                    })}
                  >
                    <div className="space-y-0.5 md:space-y-1">
                      <div className="text-[8px] md:text-xs">{dayName}</div>
                      <div
                        className={`inline-flex items-center justify-center w-5 h-5 md:w-8 md:h-8 rounded-full text-[9px] md:text-sm font-semibold ${today
                          ? "bg-blue-600 text-white"
                          : allDayAvailable
                            ? "bg-green-500 text-white"
                            : partialDayAvailable
                              ? "bg-yellow-500 text-white"
                              : "text-gray-900 bg-white border border-gray-300"
                          }`}
                      >
                        {dayNumber}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Time Slots and Day Columns */}
              {timeSlots.map(({ time, endTime }) => {
                const availableCount = weekDays.filter((day) => {
                  const dateStr = isoDate(day);
                  return !!availabilityCovering(dateStr, time);
                }).length;
                const allTimeAvailable = availableCount === weekDays.length;
                const partialTimeAvailable = availableCount > 0 && availableCount < weekDays.length;

                return (
                  <React.Fragment key={time}>
                    <button
                      type="button"
                      onClick={() => handleTimeRowToggle(time)}
                      className={`p-1.5 md:p-2 border-r border-b border-gray-200 text-[9px] md:text-xs font-semibold h-[70px] md:h-[90px] flex items-center justify-center sticky left-0 z-[1] text-gray-700 box-border hover:bg-gray-50 transition-colors ${allTimeAvailable ? "bg-green-50" : partialTimeAvailable ? "bg-yellow-50" : "bg-white"
                        }`}
                      title={t("availability.clickTimeRow", {
                        defaultValue:
                          "Click to toggle this time across all days",
                      })}
                    >
                      <div className="text-center">
                        <div className="hidden md:block font-medium">
                          {time}-{endTime}
                        </div>
                        <div className="md:hidden text-[8px] leading-tight">
                          <div>{time}</div>
                          <div className="text-[7px]">{endTime}</div>
                        </div>
                        <div
                          className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mx-auto mt-0.5 md:mt-1 ${allTimeAvailable ? "bg-green-500" : partialTimeAvailable ? "bg-yellow-500" : "bg-gray-300"
                            }`}
                        ></div>
                      </div>
                    </button>

                    {/* Day Columns for this time slot */}
                    {weekDays.map((day) => {
                      const dateStr = isoDate(day);
                      const hasAvailability = !!availabilityCovering(
                        dateStr,
                        time,
                      );
                      const slotKey = `${dateStr}|${time}`;
                      const isLoading = loadingSlots.has(`${dateStr}-${time}`);
                      const isSelected = selectedSlots.has(slotKey);

                      return (
                        <div
                          key={`${dateStr}-${time}`}
                          className="w-full h-[70px] md:h-[90px] p-1 md:p-2 border-r border-b border-gray-200 bg-white relative box-border"
                        >
                          {isLoading ? (
                            <div
                              className={`w-full h-full p-1 md:p-2 box-border flex items-center justify-center rounded-lg ${hasAvailability ? "bg-green-50" : "bg-white"
                                }`}
                            >
                              <div
                                className="animate-spin rounded-full h-4 w-4 md:h-6 md:w-6 border-b-2 border-t-transparent"
                                style={{
                                  borderBottomColor: hasAvailability
                                    ? "#10B981"
                                    : "#6B7280",
                                }}
                              ></div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onMouseDown={() =>
                                handleSlotMouseDown(dateStr, time)
                              }
                              onMouseEnter={() =>
                                handleSlotMouseEnter(dateStr, time)
                              }
                              onClick={() =>
                                !isDraggingRef.current &&
                                handleSlotClick(dateStr, time)
                              }
                              className={`w-full h-full p-1 md:p-2 box-border flex items-center justify-center rounded-lg transition-all duration-200 ${isSelected
                                ? "ring-2 ring-blue-500 ring-offset-1 md:ring-offset-2"
                                : hasAvailability
                                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                                  : "bg-red-50 text-red-700 hover:bg-red-100"
                                }`}
                            >
                              {hasAvailability ? (
                                <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                  <X className="h-3 w-3 md:h-4 md:w-4" />
                                  <span className="text-[9px] md:text-xs font-medium">
                                    {t("availability.active", {
                                      defaultValue: "Active",
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                  <Plus className="h-4 w-4 md:h-5 md:w-5" />
                                  <span className="text-[9px] md:text-xs font-medium">
                                    {t("availability.add", {
                                      defaultValue: "Add",
                                    })}
                                  </span>
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          {t("availability.weekInstructions", {
            defaultValue:
              "Click individual slots, day headers, or time rows to toggle. Drag to select multiple slots.",
          })}
        </div>
      </div>
    </DndProvider>
  );
};

export default AvailabilityWeekView;
