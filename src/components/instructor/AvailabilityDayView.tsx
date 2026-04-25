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

interface AvailabilityDayViewProps {
  currentDate: Date;
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];
const AVAILABILITY_BLOCK_MINUTES = 60;

const addMinutes = (time: string, minutesToAdd: number): string => {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  const total = h * 60 + m + minutesToAdd;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const AvailabilityDayView: React.FC<AvailabilityDayViewProps> = ({
  currentDate,
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

  const dateStr = isoDate(currentDate);

  // Always check school open/close first, fallback to 9/18 when missing or invalid
  const timeSlots = useMemo(() => {
    const { startHour, endHour } = getSchoolHourBounds(
      school?.openHoursStart,
      school?.openHoursEnd,
    );
    return generateTimeSlots(startHour, endHour).map((s) => ({
      time: s.start,
      endTime: s.end,
    }));
  }, [
    school?.openHoursStart,
    school?.openHoursEnd,
  ]);

  const { data: availability = [], isLoading: loading } = useQuery({
    queryKey: ["instructor-availability", user?.id, dateStr, dateStr],
    queryFn: () => availabilityApi.getRange(user!.id, dateStr, dateStr),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const availabilityCovering = (time: string): AvailabilitySlot | undefined => {
    const dayAvailability = availability.filter((a) => a.active);
    const t = time.padEnd(5, ":00");
    return dayAvailability.find(
      (a) =>
        t >= a.time_start.substring(0, 5) && t < a.time_end.substring(0, 5),
    );
  };

  const handleSlotClick = async (time: string) => {
    if (!user?.id || loadingSlots.has(time)) return;
    const slot = availabilityCovering(time);

    try {
      setLoadingSlots((prev) => new Set(prev).add(time));
      if (slot) {
        await availabilityApi.remove(slot.id);
      } else {
        const startTime = time;
        const endTime = addMinutes(
          time,
          AVAILABILITY_BLOCK_MINUTES,
        );
        await availabilityApi.add({
          instructorId: user.id,
          date: dateStr,
          timeStart: startTime,
          timeEnd: endTime,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["instructor-availability", user.id, dateStr],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update availability");
    } finally {
      setLoadingSlots((prev) => {
        const next = new Set(prev);
        next.delete(time);
        return next;
      });
    }
  };

  const handleSlotMouseDown = (time: string) => {
    setSelectedSlots(new Set([time]));
    isDraggingRef.current = true;
  };

  const handleSlotMouseEnter = (time: string) => {
    if (isDraggingRef.current) {
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        next.add(time);
        return next;
      });
    }
  };

  const handleMouseUp = useCallback(async () => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;

    if (wasDragging && selectedSlots.size > 1 && user?.id) {
      try {
        const uniqueTimes = Array.from(new Set(selectedSlots));

        const removes: Promise<any>[] = [];
        const adds: {
          instructorId: string;
          date: string;
          timeStart: string;
          timeEnd: string;
        }[] = [];

        uniqueTimes.forEach((time) => {
          const slot = availabilityCovering(time);
          if (slot) {
            removes.push(availabilityApi.remove(slot.id));
          } else {
            const startTime = time;
            const endTime = addMinutes(
              time,
              AVAILABILITY_BLOCK_MINUTES,
            );
            adds.push({
              instructorId: user.id,
              date: dateStr,
              timeStart: startTime,
              timeEnd: endTime,
            });
          }
        });

        if (removes.length > 0) {
          await Promise.all(removes);
        }

        if (adds.length > 0) {
          await Promise.all(adds.map((add) => availabilityApi.add(add)));
        }

        await queryClient.invalidateQueries({
          queryKey: ["instructor-availability", user.id, dateStr],
        });
      } catch (e: any) {
        setError(e?.message || "Failed to update availability");
      }
    }
    setSelectedSlots(new Set());
  }, [selectedSlots, user?.id, dateStr, availabilityCovering, queryClient]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: `120px minmax(280px, 1fr)` }}
          >
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
                  <div className="w-full h-full p-2 rounded-lg bg-gray-50 animate-pulse"></div>
                </div>
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

        <div className="bg-white rounded-lg shadow p-4">
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
                defaultValue: "Click: single slot • Drag: multiple slots",
              })}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-gray-500">
                {t("availability.autoSave", {
                  defaultValue: "Automatic saving",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Day header  */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString(i18n.language, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {isToday() &&
                ` • ${t("availability.today", { defaultValue: "Today" })}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t("availability.schoolHours", {
                defaultValue: "School hours: 09:00:00 - 19:00:00",
              })}
            </p>
          </div>
          <button
            onClick={async () => {
              if (!user?.id) return;
              const allAvailable = timeSlots.every(
                ({ time }) => !!availabilityCovering(time),
              );

              const affectedSlots = timeSlots.map(({ time }) => time);
              setLoadingSlots((prev) => {
                const next = new Set(prev);
                affectedSlots.forEach((slot) => next.add(slot));
                return next;
              });

              try {
                if (allAvailable) {
                  // Remove all availability for the day
                  const activeSlots = availability.filter((a) => a.active);
                  await Promise.all(
                    activeSlots.map((slot) => availabilityApi.remove(slot.id)),
                  );
                } else {
                  // Add availability for all time slots
                  const promises = timeSlots
                    .filter(({ time }) => !availabilityCovering(time))
                    .map(({ time }) => {
                      const startTime = time;
                      const endTime = addMinutes(
                        time,
                        AVAILABILITY_BLOCK_MINUTES,
                      );
                      return availabilityApi.add({
                        instructorId: user.id,
                        date: dateStr,
                        timeStart: startTime,
                        timeEnd: endTime,
                      });
                    });
                  await Promise.all(promises);
                }
                // Invalidate and refetch availability
                await queryClient.invalidateQueries({
                  queryKey: ["instructor-availability", user.id, dateStr],
                });
              } catch (e: any) {
                setError(e?.message || "Failed to update availability");
              } finally {
                setLoadingSlots((prev) => {
                  const next = new Set(prev);
                  affectedSlots.forEach((slot) => next.delete(slot));
                  return next;
                });
              }
            }}
            className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
              timeSlots.every(({ time }) => !!availabilityCovering(time))
                ? "bg-green-50 border-green-500 text-green-700 hover:bg-green-100"
                : "bg-red-50 border-red-500 text-red-700 hover:bg-red-100"
            }`}
          >
            {timeSlots.every(({ time }) => !!availabilityCovering(time))
              ? t("availability.available", { defaultValue: "Available" }) +
                " - " +
                t("availability.clickToDeactivate", {
                  defaultValue: "Click To Deactivate",
                })
              : t("availability.notAvailable", {
                  defaultValue: "Not Available",
                }) +
                " - " +
                t("availability.clickToActivate", {
                  defaultValue: "Click To Activate",
                })}
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div
              className="grid gap-0"
              style={{ gridTemplateColumns: `120px minmax(280px, 1fr)` }}
            >
              {/* Header Row */}
              <div className="p-3 border-r border-b-2 border-gray-300 bg-gray-50 font-semibold text-xs text-center text-gray-600 sticky left-0 z-[2] box-border">
                <div>{t("calendar.time")}</div>
              </div>
              <div className="p-3 border-r border-b-2 border-gray-300 bg-gray-50 font-semibold text-xs text-center text-gray-600 box-border">
                <div>
                  {user?.firstName} {user?.lastName}
                </div>
              </div>

              {/* Time Slots */}
              {timeSlots.map(({ time, endTime }) => {
                const hasAvailability = !!availabilityCovering(time);
                const isLoading = loadingSlots.has(time);
                const isSelected = selectedSlots.has(time);

                return (
                  <React.Fragment key={time}>
                    {/* Time Slot Cell */}
                    <div className="p-2 border-r border-b border-gray-200 bg-white text-xs font-semibold h-[90px] flex items-center justify-center sticky left-0 z-[1] text-gray-700 box-border">
                      <div className="text-center">
                        {time}-{endTime}
                      </div>
                    </div>

                    {/* Availability Cell */}
                    <div className="w-full h-[90px] p-2 border-r border-b border-gray-200 bg-white relative box-border">
                      {isLoading ? (
                        <div
                          className={`w-full h-full p-2 box-border flex items-center justify-center rounded-lg ${
                            hasAvailability ? "bg-green-50" : "bg-white"
                          }`}
                        >
                          <div
                            className="animate-spin rounded-full h-6 w-6 border-b-2 border-t-transparent"
                            style={{
                              borderBottomColor: hasAvailability
                                ? "#10B981"
                                : "#6B7280",
                            }}
                          ></div>
                        </div>
                      ) : (
                        <button
                          onMouseDown={() => handleSlotMouseDown(time)}
                          onMouseEnter={() => handleSlotMouseEnter(time)}
                          onClick={() =>
                            !isDraggingRef.current && handleSlotClick(time)
                          }
                          className={`w-full h-full p-2 box-border flex items-center justify-center rounded-lg transition-all duration-200 ${
                            isSelected
                              ? "ring-2 ring-blue-500 ring-offset-2"
                              : hasAvailability
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {hasAvailability ? (
                            <div className="flex flex-col items-center gap-1">
                              <X className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {t("availability.active", {
                                  defaultValue: "Active",
                                })}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Plus className="h-5 w-5" />
                              <span className="text-xs font-medium">
                                {t("availability.add", { defaultValue: "Add" })}
                              </span>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 text-center">
          {t("availability.dayInstructions", {
            defaultValue:
              "Click on individual slots to change, or on the badge above to change the whole day",
          })}
        </div>
      </div>
    </DndProvider>
  );
};

export default AvailabilityDayView;
