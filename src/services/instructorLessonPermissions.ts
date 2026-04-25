import { api } from "@/lib/api";

export interface InstructorLessonPermission {
  id: string;
  instructor_id: string;
  school_id: string;
  can_edit_lessons: boolean;
  updated_at: string;
}

export const instructorLessonPermissionsApi = {
  async listBySchool(schoolId?: string): Promise<InstructorLessonPermission[]> {
    const { data } = await api.get("/instructor-lesson-permissions", {
      params: schoolId ? { schoolId } : undefined,
    });
    return data.data || [];
  },

  async setPermission(payload: {
    instructorId: string;
    schoolId: string;
    canEditLessons: boolean;
  }): Promise<InstructorLessonPermission> {
    const { data } = await api.put("/instructor-lesson-permissions", payload);
    return data.data;
  },

  async removePermission(instructorId: string, schoolId: string): Promise<void> {
    await api.delete("/instructor-lesson-permissions", {
      params: { instructorId, schoolId },
    });
  },

  async getMyPermission(schoolId?: string): Promise<{
    schoolId: string | null;
    canEditLessons: boolean;
  }> {
    const { data } = await api.get("/instructor-lesson-permissions/me", {
      params: schoolId ? { schoolId } : undefined,
    });
    return data.data;
  },
};
