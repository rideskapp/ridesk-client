import { api } from "@/lib/api";

export interface AvailabilitySlot {
  id: string;
  instructor_id: string;
  date: string;
  time_start: string;
  time_end: string;
  active: boolean;
}

export const availabilityApi = {
  getRange: async (instructorId: string, startDate: string, endDate: string) => {
    const { data } = await api.get("/availability", {
      params: { instructorId, startDate, endDate },
    });
    return data.data as AvailabilitySlot[];
  },
  add: async (payload: { instructorId: string; date: string; timeStart: string; timeEnd: string }) => {
    const { data } = await api.post("/availability", payload);
    return data.data as { id: string };
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/availability/${id}`);
    return data.data as { id: string };
  },
  check: async (params: { instructorId: string; date: string; timeStart: string; timeEnd: string }) => {
    const { data } = await api.get("/availability/check", { params });
    return data.data as { available: boolean };
  },
  listAvailableInstructors: async (params: { date: string; timeStart: string; timeEnd: string; discipline?: string }) => {
    const { data } = await api.get("/availability/available-instructors", { params });
    return data.data as Array<{ instructor_id: string; first_name: string; last_name: string }>;
  },
  getBatchRange: async (
    instructorIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<AvailabilitySlot[]> => {
    const ids = instructorIds.join(",");
    const response = await api.get("/availability/batch", {
      params: { instructorIds: ids, startDate, endDate },
    });
    return response.data.data;
  },
};


