import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolCalendarApi, WeeklyAvailability, SpecialDate } from "@/services/schoolCalendar";

export const useWeeklyAvailabilityForSchool = (schoolId: string | undefined) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["school-weekly", schoolId],
    queryFn: () => schoolCalendarApi.getWeeklyAvailabilityForSchool(schoolId!),
    enabled: !!schoolId,
  });
  const mutation = useMutation({
    mutationFn: (items: WeeklyAvailability[]) =>
      schoolCalendarApi.setWeeklyAvailabilityForSchool(schoolId!, items),
    onSuccess: (data) => {
      qc.setQueryData(["school-weekly", schoolId], data);
    },
  });
  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending };
};

export const useSpecialDatesForSchool = (
  schoolId: string | undefined,
  from: string,
  to: string,
) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["school-special-dates", schoolId, from, to],
    queryFn: () => schoolCalendarApi.getSpecialDatesForSchool(schoolId!, from, to),
    enabled: !!schoolId,
  });

  const upsert = useMutation({
    mutationFn: (items: SpecialDate[]) =>
      schoolCalendarApi.upsertSpecialDatesForSchool(schoolId!, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school-special-dates", schoolId] }),
  });

  const del = useMutation({
    mutationFn: (dates: string[]) =>
      schoolCalendarApi.deleteSpecialDatesForSchool(schoolId!, dates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school-special-dates", schoolId] }),
  });

  return {
    ...query,
    upsert: upsert.mutateAsync,
    deleting: del.isPending,
    remove: del.mutateAsync,
  };
};

