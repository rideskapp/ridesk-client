import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export type WeeklyAvailability = { weekday: number; is_available: boolean };
export type SpecialDate = { date: string; is_available: boolean; reason?: string | null };

const withSchoolId = (): string => {
  const { user } = useAuthStore.getState();
  if (!user?.schoolId) throw new Error("No school associated with current user");
  return user.schoolId;
};

export const schoolCalendarApi = {
  async getWeeklyAvailability(): Promise<WeeklyAvailability[]> {
    const schoolId = withSchoolId();
    const { data } = await api.get(`/schools/${schoolId}/calendar/availability`);
    return data.data as WeeklyAvailability[];
  },

  async setWeeklyAvailability(items: WeeklyAvailability[]): Promise<WeeklyAvailability[]> {
    const schoolId = withSchoolId();
    const { data } = await api.put(`/schools/${schoolId}/calendar/availability`, { items });
    return data.data as WeeklyAvailability[];
  },

  async getSpecialDates(from: string, to: string): Promise<SpecialDate[]> {
    const schoolId = withSchoolId();
    const { data } = await api.get(`/schools/${schoolId}/calendar/special-dates`, {
      params: { from, to },
    });
    return data.data as SpecialDate[];
  },

  async upsertSpecialDates(items: SpecialDate[]): Promise<SpecialDate[]> {
    const schoolId = withSchoolId();
    const { data } = await api.put(`/schools/${schoolId}/calendar/special-dates/bulk`, { items });
    return data.data as SpecialDate[];
  },

  async deleteSpecialDates(dates: string[]): Promise<number> {
    const schoolId = withSchoolId();
    const { data } = await api.delete(`/schools/${schoolId}/calendar/special-dates`, { data: { dates } });
    return (data.data?.deleted as number) || 0;
  },

  async isAvailable(date: string): Promise<boolean> {
    const schoolId = withSchoolId();
    const { data } = await api.get(`/schools/${schoolId}/calendar/is-available`, { params: { date } });
    return Boolean(data.data?.is_available);
  },

  async getWeeklyAvailabilityForSchool(schoolId: string): Promise<WeeklyAvailability[]> {
    const { data } = await api.get(`/schools/${schoolId}/calendar/availability`);
    return data.data as WeeklyAvailability[];
  },

  async setWeeklyAvailabilityForSchool(schoolId: string, items: WeeklyAvailability[]): Promise<WeeklyAvailability[]> {
    const { data } = await api.put(`/schools/${schoolId}/calendar/availability`, { items });
    return data.data as WeeklyAvailability[];
  },

  async getSpecialDatesForSchool(schoolId: string, from: string, to: string): Promise<SpecialDate[]> {
    const { data } = await api.get(`/schools/${schoolId}/calendar/special-dates`, {
      params: { from, to },
    });
    return data.data as SpecialDate[];
  },

  async upsertSpecialDatesForSchool(schoolId: string, items: SpecialDate[]): Promise<SpecialDate[]> {
    const { data } = await api.put(`/schools/${schoolId}/calendar/special-dates/bulk`, { items });
    return data.data as SpecialDate[];
  },

  async deleteSpecialDatesForSchool(schoolId: string, dates: string[]): Promise<number> {
    const { data } = await api.delete(`/schools/${schoolId}/calendar/special-dates`, { data: { dates } });
    return (data.data?.deleted as number) || 0;
  },
};


