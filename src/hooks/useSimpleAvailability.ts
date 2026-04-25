import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { DayAvailability, AvailabilitySlot } from '@/types/availability';

/**
 * Transforms raw API availability slots into grouped DayAvailability structure
 */
const transformAvailabilityData = (
  rawSlots: AvailabilitySlot[],
): DayAvailability[] => {
  // Group slots by date
  const slotsByDate = new Map<string, AvailabilitySlot[]>();

  rawSlots.forEach((slot) => {
    const date = slot.date;
    if (!slotsByDate.has(date)) {
      slotsByDate.set(date, []);
    }
    slotsByDate.get(date)!.push(slot);
  });

  // Convert grouped slots to DayAvailability format
  const dayAvailabilityList: DayAvailability[] = [];

  slotsByDate.forEach((slots, date) => {
    // Sort slots by time_start for consistent ordering
    const sortedSlots = slots.sort((a, b) =>
      a.time_start.localeCompare(b.time_start),
    );

    // Transform slots to the expected format
    const time_slots = sortedSlots.map((slot) => ({
      id: slot.id,
      start_time: slot.time_start,
      end_time: slot.time_end,
      available: slot.active,
    }));

    // Calculate day_status:
    // - "available" if all slots are active
    // - "partial" if some slots are active
    // - "off" if no slots are active
    const activeCount = slots.filter((slot) => slot.active).length;
    let day_status: 'available' | 'partial' | 'off';
    if (activeCount === 0) {
      day_status = 'off';
    } else if (activeCount === slots.length) {
      day_status = 'available';
    } else {
      day_status = 'partial';
    }

    dayAvailabilityList.push({
      date,
      day_status,
      time_slots,
    });
  });

  // Sort by date for consistent ordering
  return dayAvailabilityList.sort((a, b) => a.date.localeCompare(b.date));
};

export const useSimpleAvailability = (instructorId: string) => {
  const [availabilityData, setAvailabilityData] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailabilityData = useCallback(
    async (dateFrom: string, dateTo: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/availability', {
          params: {
            instructorId,
            startDate: dateFrom,
            endDate: dateTo,
          },
        });

        // Transform the raw API response to DayAvailability format
        const rawSlots = (response.data.data || []) as AvailabilitySlot[];
        const transformedData = transformAvailabilityData(rawSlots);
        setAvailabilityData(transformedData);
        return transformedData;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [instructorId],
  );

  const toggleSlot = useCallback(
    async (date: string, timeStart: string, timeEnd: string) => {
      try {
        setError(null); // Clear any previous error
        setLoading(true);

        const normalizedStart = timeStart.length === 5 ? `${timeStart}:00` : timeStart;
        const normalizedEnd = timeEnd.length === 5 ? `${timeEnd}:00` : timeEnd;

        // Check if slot is already available
        const dayData = availabilityData.find(d => d.date === date);
        const existingSlot = dayData?.time_slots.find(
          s => s.start_time.startsWith(normalizedStart.substring(0, 5)) && s.available
        );

        if (existingSlot && existingSlot.id) {
          // Remove availability
          await api.delete(`/availability/${existingSlot.id}`);
        } else {
          // Add availability
          await api.post('/availability', {
            instructorId,
            date,
            timeStart: normalizedStart,
            timeEnd: normalizedEnd,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instructorId, availabilityData],
  );

  const toggleDay = useCallback(
    async (date: string, timeSlots: Array<{ start: string; end: string }>) => {
      try {
        setLoading(true);
        setError(null);

        if (timeSlots.length === 0) {
          setLoading(false);
          return;
        }

        // Normalize helper
        const normalize = (t: string) => (t.length === 5 ? `${t}:00` : t);

        const dayData = availabilityData.find(d => d.date === date);
        const normalizedRequestedStarts = new Set(
          timeSlots.map(slot => normalize(slot.start).substring(0, 5))
        );

        // Check if all requested slots are currently active
        const allActive = dayData && timeSlots.every((slot) => {
          const startPrefix = normalize(slot.start).substring(0, 5);
          return dayData.time_slots.some(
            s => s.available && s.start_time.startsWith(startPrefix)
          );
        });

        if (allActive && dayData) {
          // All requested slots are active — remove ONLY them to toggle OFF
          const activeSlots = dayData.time_slots.filter(
            s => s.available && s.id && normalizedRequestedStarts.has(s.start_time.substring(0, 5))
          );
          await Promise.all(
            activeSlots.map(slot => api.delete(`/availability/${slot.id}`))
          );
        } else {
          // Some or no requested slots are active — add ONLY missing ones to toggle ON
          const slotsToPost = timeSlots.filter((slot) => {
            const startPrefix = normalize(slot.start).substring(0, 5);
            const isAlreadyActive = dayData?.time_slots.some(
              s => s.available && s.start_time.startsWith(startPrefix)
            );
            return !isAlreadyActive;
          });

          const operations = slotsToPost.map((slot) => {
            return api.post('/availability', {
              instructorId,
              date,
              timeStart: normalize(slot.start),
              timeEnd: normalize(slot.end),
            });
          });

          await Promise.all(operations);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instructorId, availabilityData],
  );

  const toggleTimeRow = useCallback(
    async (timeSlot: string, dates: string[]) => {
      try {
        setLoading(true);
        setError(null);

        const normalizedStart = timeSlot.length === 5 ? `${timeSlot}:00` : timeSlot;
        // Use modular arithmetic to handle 23:00 -> 00:00 instead of 24:00
        const hour = parseInt(timeSlot.split(':')[0], 10);
        const nextHour = (hour + 1) % 24;
        const normalizedEnd = `${nextHour.toString().padStart(2, '0')}:00:00`;

        // Check if this time slot is active for ALL dates
        const allActive = dates.every((dateStr) => {
          const dayData = availabilityData.find(d => d.date === dateStr);
          if (!dayData) return false;
          return dayData.time_slots.some(
            s => s.start_time.startsWith(normalizedStart.substring(0, 5)) && s.available
          );
        });

        if (allActive) {
          // All active — remove them to toggle OFF
          const removePromises: Promise<any>[] = [];
          dates.forEach((dateStr) => {
            const dayData = availabilityData.find(d => d.date === dateStr);
            if (dayData) {
              const matchingSlots = dayData.time_slots.filter(
                s => s.start_time.startsWith(normalizedStart.substring(0, 5)) && s.available && s.id
              );
              matchingSlots.forEach(slot => {
                removePromises.push(api.delete(`/availability/${slot.id}`));
              });
            }
          });
          await Promise.all(removePromises);
        } else {
          // Some or none active — add missing ones to toggle ON
          const operations = dates
            .filter((dateStr) => {
              const dayData = availabilityData.find(d => d.date === dateStr);
              return !dayData?.time_slots.some(
                s => s.start_time.startsWith(normalizedStart.substring(0, 5)) && s.available
              );
            })
            .map((dateStr) =>
              api.post('/availability', {
                instructorId,
                date: dateStr,
                timeStart: normalizedStart,
                timeEnd: normalizedEnd,
              }),
            );

          if (operations.length > 0) {
            await Promise.all(operations);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instructorId, availabilityData],
  );

  const refreshDateRange = useCallback(
    async (startDate: string, endDate: string) => {
      return fetchAvailabilityData(startDate, endDate);
    },
    [fetchAvailabilityData],
  );

  const setAvailabilityForRange = useCallback(
    async (
      slots: Array<{ date: string; timeStart: string; timeEnd: string }>,
    ) => {
      try {
        setLoading(true);
        setError(null);

        if (slots.length === 0) return;

        // 1. Find the date range of the slots to be added
        const dates = slots.map(s => s.date).sort();
        if (dates.length === 0) return;
        
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        // 2. Fetch existing availability for this range
        const response = await api.get('/availability', {
          params: {
            instructorId,
            startDate,
            endDate,
          },
        });
        
        const existingRawSlots = (response.data.data || []) as AvailabilitySlot[];

        // 3. Filter out slots that already exist and separate reactivations
        const slotsToCreate: typeof slots = [];
        const slotsToReactivate: typeof slots = [];

        slots.forEach((slot) => {
          const normalizedStart = slot.timeStart.length === 5 ? `${slot.timeStart}:00` : slot.timeStart;
          const normalizedEnd = slot.timeEnd.length === 5 ? `${slot.timeEnd}:00` : slot.timeEnd;

          // Match by date, time_start, and time_end, regardless of active state
          const existing = existingRawSlots.find(
            (e) =>
              e.date === slot.date &&
              e.time_start === normalizedStart &&
              e.time_end === normalizedEnd
          );

          if (!existing) {
            slotsToCreate.push(slot);
          } else if (!existing.active) {
            slotsToReactivate.push(slot);
          }
        });

        const promises: Promise<any>[] = [];

        // 4. Batch create new slots
        if (slotsToCreate.length > 0) {
          promises.push(
            api.post('/availability/batch', {
              instructorId,
              slots: slotsToCreate.map((slot) => ({
                date: slot.date,
                timeStart: slot.timeStart.length === 5 ? `${slot.timeStart}:00` : slot.timeStart,
                timeEnd: slot.timeEnd.length === 5 ? `${slot.timeEnd}:00` : slot.timeEnd,
              })),
            })
          );
        }

        // 5. Reactivate inactive slots
        slotsToReactivate.forEach((slot) => {
          const normalizedStart = slot.timeStart.length === 5 ? `${slot.timeStart}:00` : slot.timeStart;
          const normalizedEnd = slot.timeEnd.length === 5 ? `${slot.timeEnd}:00` : slot.timeEnd;
          promises.push(
            api.post('/availability', {
              instructorId,
              date: slot.date,
              timeStart: normalizedStart,
              timeEnd: normalizedEnd,
            })
          );
        });

        if (promises.length > 0) {
          await Promise.all(promises);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instructorId],
  );

  const removeAllForRange = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        setLoading(true);
        setError(null);

        // Fetch fresh data from API to get reliable slot IDs
        const response = await api.get('/availability', {
          params: {
            instructorId,
            startDate,
            endDate,
          },
        });

        const rawSlots = (response.data.data || []) as AvailabilitySlot[];
        const activeSlots = rawSlots.filter(s => s.active);

        if (activeSlots.length > 0) {
          await Promise.all(
            activeSlots.map(slot => api.delete(`/availability/${slot.id}`))
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instructorId],
  );

  return {
    availabilityData,
    loading,
    error,
    fetchAvailabilityData,
    toggleSlot,
    toggleDay,
    toggleTimeRow,
    refreshDateRange,
    setAvailabilityForRange,
    removeAllForRange,
  };
};
