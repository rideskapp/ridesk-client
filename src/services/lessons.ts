import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export interface LessonDetails {
  id: string;
  date: string;
  time: string;
  duration: number;
  discipline: string;
  level: string;
  price: number;
  notes?: string;
  booking_id?: string;
  product_id?: string;
  lesson_status_id?: string;
  payment_status_id?: string;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    whatsapp_number?: string;
    avatar?: string;
    specialties?: string[];
  };
  product?: {
    id: string;
    name: string;
    title?: string;
    price: number;
    duration_hours?: number;
    category?: {
      id: string;
      name: string;
      color?: string;
    };
  };
  participants: Array<{
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    whatsapp_number?: string;
    skill_level?: string;
  }>;
  booking?: {
    id: string;
    total_minutes: number;
    remaining_minutes: number;
    start_date: string;
    end_date: string;
  };
  bookingLessons?: Array<{
    id: string;
    date: string;
    time: string;
    duration: number;
  }>;
  lessonStatus?: {
    id: string;
    name: string;
    display_name: string;
    color: string;
  };
  paymentStatus?: {
    id: string;
    name: string;
    display_name: string;
    color: string;
  };
  school?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface LessonListItem {
  id: string;
  instructor_id: string;
  instructor_first_name?: string | null;
  instructor_last_name?: string | null;
  instructor_avatar?: string | null;
  date: string;
  time: string;
  duration: number;
  discipline?: string | null;
  product_name?: string | null;
  lesson_status_id?: string | null;
  lesson_status_name?: string | null;
  payment_status_id?: string | null;
  payment_status_name?: string | null;
  student_first_name?: string | null;
  student_last_name?: string | null;
  student_avatar?: string | null;
  school_name?: string | null;
  school_logo?: string | null;
  booking_id?: string;
}

export interface StudentLessonCounts {
  studentId: string;
  total: number;
  upcoming: number;
}

export interface InstructorConflictLesson {
  id: string;
  instructor_id: string;
  school_id: string;
  date: string;
  time: string;
  duration: number;
  school_name: string | null;
  school_logo: string | null;
}

export const lessonsApi = {
  listByRange: async (params: {
    startDate: string;
    endDate: string;
    instructorId?: string;
    discipline?: string;
    limit?: number;
    offset?: number;
    schoolId?: string;
    studentId?: string;
  }) => {
    // Get user role from auth store
    const { user } = useAuthStore.getState();

    // Use different endpoints based on user role
    const endpoint =
      user?.role === "INSTRUCTOR" ? "/lessons/instructor" : "/lessons";

    // Use process logger in production instead of console.log
    if (import.meta.env.DEV) {
      console.debug(
        `[LessonsAPI] User role: ${user?.role}, Using endpoint: ${endpoint}`,
      );
    }

    try {
      const { data } = await api.get(endpoint, {
        params: {
          ...params,
          ...(params.schoolId !== undefined &&
            params.schoolId !== null &&
            params.schoolId !== "" && { schoolId: params.schoolId }),
          ...(params.studentId !== undefined &&
            params.studentId !== null &&
            params.studentId !== "" && { studentId: params.studentId }),
        },
      });
      return data.data as Array<LessonListItem>; // Return typed array
    } catch (error: any) {
      // Normalize common 403 coming from missing school association so UI can show CTA
      const backendMessage =
        error?.response?.data?.message || error?.response?.data?.error;
      if (error?.response?.status === 403) {
        const message =
          backendMessage ||
          "User not associated with any school. Please create your school first.";
        throw new Error(message);
      }
      throw new Error(
        backendMessage || error?.message || "Failed to load lessons",
      );
    }
  },
  getById: async (id: string): Promise<LessonDetails> => {
    const { data } = await api.get(`/lessons/${id}`);
    return data.data as LessonDetails;
  },
  reschedule: async (
    id: string,
    payload: {
      date: string;
      timeStart: string;
      durationMinutes: number;
      instructorId?: string;
    },
  ) => {
    const { data } = await api.post(`/lessons/${id}/reschedule`, payload);
    return data.data as {
      id: string;
      date: string;
      time: string;
      duration: number;
    };
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/lessons/${id}`);
    return data.data as { id: string };
  },
  update: async (
    id: string,
    payload: {
      lessonStatusId?: string;
      duration?: number;
      paymentStatusId?: string;
      time?: string;
    },
  ) => {
    const updatePayload: any = {};
    if (payload.lessonStatusId !== undefined) {
      updatePayload.lesson_status_id = payload.lessonStatusId || null;
    }
    if (payload.duration !== undefined) {
      updatePayload.duration = payload.duration;
    }
    if (payload.paymentStatusId !== undefined) {
      updatePayload.payment_status_id = payload.paymentStatusId || null;
    }
    if (payload.time !== undefined) {
      updatePayload.time = payload.time;
    }
    const { data } = await api.patch(`/lessons/${id}`, updatePayload);
    return data.data as {
      id: string;
      lesson_status_id?: string | null;
      duration?: number;
    };
  },
  countsByStudents: async (params: {
    startDate: string;
    endDate: string;
    studentIds: string[];
    schoolId?: string;
  }) => {
    const normalizedStudentIds = params.studentIds.filter((id) => !!id);
    if (normalizedStudentIds.length === 0) {
      return [];
    }

    try {
      const { data } = await api.get("/lessons/counts", {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          studentIds: normalizedStudentIds.join(","),
          ...(params.schoolId !== undefined &&
            params.schoolId !== null &&
            params.schoolId !== "" && { schoolId: params.schoolId }),
        },
      });
      return data.data as Array<StudentLessonCounts>;
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message || error?.response?.data?.error;
      throw new Error(
        backendMessage || error?.message || "Failed to load lesson counts",
      );
    }
  },
  getInstructorConflicts: async (params: {
    instructorIds: string[];
    startDate: string;
    endDate: string;
  }) => {
    try {
      const { data } = await api.get("/lessons/instructor-conflicts", {
        params: {
          instructorIds: params.instructorIds.join(","),
          startDate: params.startDate,
          endDate: params.endDate,
        },
      });
      return data.data as Array<InstructorConflictLesson>;
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message || error?.response?.data?.error;
      throw new Error(
        backendMessage ||
          error?.message ||
          "Failed to load instructor conflicts",
      );
    }
  },
};
