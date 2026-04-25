import { api } from '@/lib/api';

export interface Discipline {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
  school_id?: string;
  created_at: string;
  updated_at: string;
}

export const disciplinesApi = {
  // Get all active disciplines (authenticated, role-aware)
  async getActiveDisciplines(schoolId?: string): Promise<Discipline[]> {
    try {
      const params = schoolId ? { schoolId } : {};
      const response = await api.get('/disciplines', { params });
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch disciplines"
      );
    }
  },

  // Public: get active disciplines for a specific school without auth
  async getActiveDisciplinesPublic(schoolId: string): Promise<Discipline[]> {
    try {
      const response = await api.get(
        `/disciplines/public/${encodeURIComponent(schoolId)}/active`,
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch disciplines",
      );
    }
  },

  async getAllDisciplines(schoolId?: string): Promise<Discipline[]> {
    try {
      const params = schoolId ? { schoolId } : {};
      const response = await api.get('/disciplines/all', { params });
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch all disciplines"
      );
    }
  },

  async toggleDisciplineStatus(id: string): Promise<Discipline> {
    try {
      const response = await api.patch(`/disciplines/${id}/toggle-status`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to toggle discipline status"
      );
    }
  },

  async createDiscipline(data: Partial<Discipline>): Promise<Discipline> {
    try {
      const response = await api.post('/disciplines', data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to create discipline"
      );
    }
  },

  async updateDiscipline(id: string, data: Partial<Discipline>): Promise<Discipline> {
    try {
      const response = await api.put(`/disciplines/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update discipline"
      );
    }
  },

  async deleteDiscipline(id: string): Promise<void> {
    try {
      await api.delete(`/disciplines/${id}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete discipline"
      );
    }
  },
};


