import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolCalendarApi, WeeklyAvailability, SpecialDate } from "@/services/schoolCalendar";
import { useAuthStore } from "@/store/auth";

export type { WeeklyAvailability, SpecialDate };

export const useWeeklyAvailability = (schoolId?: string) => {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const enabled = isSuperAdmin ? schoolId !== undefined : true;
  
  const query = useQuery({
    queryKey: ["school-weekly", schoolId],
    queryFn: () => {
      if (schoolId) {
        return schoolCalendarApi.getWeeklyAvailabilityForSchool(schoolId);
      }
      return schoolCalendarApi.getWeeklyAvailability();
    },
    enabled,
  });
  
  const mutation = useMutation({
    mutationFn: (items: WeeklyAvailability[]) => {
      if (schoolId) {
        return schoolCalendarApi.setWeeklyAvailabilityForSchool(schoolId, items);
      }
      return schoolCalendarApi.setWeeklyAvailability(items);
    },
    onSuccess: (data) => {
      qc.setQueryData(["school-weekly", schoolId], data);
    },
  });
  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending };
};

export const useSpecialDates = (from: string, to: string, schoolId?: string) => {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const enabled = isSuperAdmin ? schoolId !== undefined : true;
  
  const query = useQuery({
    queryKey: ["school-special-dates", from, to, schoolId],
    queryFn: () => {
      if (schoolId) {
        return schoolCalendarApi.getSpecialDatesForSchool(schoolId, from, to);
      }
      return schoolCalendarApi.getSpecialDates(from, to);
    },
    enabled,
  });

  const upsert = useMutation({
    mutationFn: (items: SpecialDate[]) => {
      if (schoolId) {
        return schoolCalendarApi.upsertSpecialDatesForSchool(schoolId, items);
      }
      return schoolCalendarApi.upsertSpecialDates(items);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school-special-dates"] }),
  });

  const del = useMutation({
    mutationFn: (dates: string[]) => {
      if (schoolId) {
        return schoolCalendarApi.deleteSpecialDatesForSchool(schoolId, dates);
      }
      return schoolCalendarApi.deleteSpecialDates(dates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school-special-dates"] }),
  });

  return { ...query, upsert: upsert.mutateAsync, deleting: del.isPending, remove: del.mutateAsync };
};

export const isDayAvailable = (
  weekly: WeeklyAvailability[] | undefined,
  specials: SpecialDate[] | undefined,
  date: Date,
) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const special = specials?.find((s) => s.date === dateStr);
  if (special) return special.is_available;
  if (!weekly || weekly.length !== 7) return true;
  const jsDay = date.getDay(); // 0=Sun..6=Sat
  const weekday = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0..Sun=6
  return weekly.find((w) => w.weekday === weekday)?.is_available ?? true;
};


