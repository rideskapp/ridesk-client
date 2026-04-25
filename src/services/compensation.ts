import { api } from "../lib/api";

export interface InstructorRate {
  id: string;
  instructor_id: string;
  category_id: string;
  school_id: string;
  category_name?: string;
  discipline?: string; // Kept for backward compatibility but not used
  rate_type: "hourly" | "lesson" | "percentage";
  rate_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInstructorRateRequest {
  instructor_id: string;
  category_id: string;
  school_id: string;
  rate_type: "hourly" | "lesson" | "percentage";
  rate_value: number;
  is_active?: boolean;
}

export interface UpdateInstructorRateRequest {
  category_id?: string;
  rate_type?: "hourly" | "lesson" | "percentage";
  rate_value?: number;
  is_active?: boolean;
}

export interface LessonCompensationDetail {
  lessonId: string;
  date: string;
  time: string;
  duration: number; // in hours
  categoryId: string;
  categoryName?: string | null;
  productName?: string | null;
  studentName?: string | null;
  hourlyRate: number;
  compensation: number;
  compensationPaid: boolean;
}

export interface InstructorCompensationSummary {
  instructorId: string;
  instructorName: string;
  totalCompensation: number;
  totalHours: number;
  lessonCount: number;
  lessons: LessonCompensationDetail[];
  paidCompensation: number;
  unpaidCompensation: number;
  paidLessonCount: number;
  unpaidLessonCount: number;
}

export interface CompensationReport {
  instructorSummaries: InstructorCompensationSummary[];
  stats: {
    totalCompensation: number;
    activeInstructors: number;
    totalLessons: number;
    totalHours: number;
    averagePerLesson: number;
    averagePerHour: number;
    paidCompensation: number;
    unpaidCompensation: number;
    paidLessonCount: number;
    unpaidLessonCount: number;
  };
}

export interface InstructorRatesData {
  rates: InstructorRate[];
  schoolSettings: {
    compensationMode: 'fixed' | 'variable';
  };
  categories: Array<{
    id: string;
    name: string;
    color: string;
    slug: string;
  }>;
}

export const compensationApi = {
  /**
   * Get instructor rates
   */
  async getInstructorRates(instructorId: string, schoolId: string): Promise<InstructorRate[]> {
    try {
      if (!schoolId) throw new Error("School ID is required");
      const response = await api.get(`/compensation/instructor/${instructorId}?schoolId=${schoolId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructor rates",
      );
    }
  },

  /**
   * Create instructor rate
   */
  async createInstructorRate(
    rateData: CreateInstructorRateRequest,
    schoolId: string,
  ): Promise<InstructorRate> {
    try {
      if (!schoolId) throw new Error("School ID is required");
      const response = await api.post(`/compensation/rates?schoolId=${schoolId}`, rateData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to create instructor rate",
      );
    }
  },

  /**
   * Update instructor rate
   */
  async updateInstructorRate(
    id: string,
    updates: UpdateInstructorRateRequest,
    schoolId: string,
  ): Promise<InstructorRate> {
    try {
      if (!schoolId) throw new Error("School ID is required");
      const response = await api.put(`/compensation/rates/${id}?schoolId=${schoolId}`, updates);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update instructor rate",
      );
    }
  },

  /**
   * Delete instructor rate
   */
  async deleteInstructorRate(id: string, schoolId: string): Promise<void> {
    try {
      if (!schoolId) throw new Error("School ID is required");
      await api.delete(`/compensation/rates/${id}?schoolId=${schoolId}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete instructor rate",
      );
    }
  },

  /**
   * Calculate compensation for an instructor
   */
  async calculateCompensation(
    instructorId: string,
    startDate: string,
    endDate: string,
    schoolId?: string,
  ): Promise<InstructorCompensationSummary> {
    try {
      const params = new URLSearchParams({
        instructorId,
        startDate,
        endDate,
        ...(schoolId && { schoolId }),
      });
      const response = await api.get(`/compensation/calculate?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to calculate compensation",
      );
    }
  },

  /**
   * Get compensation report
   */
  async getCompensationReport(
    startDate: string,
    endDate: string,
    schoolId?: string,
  ): Promise<CompensationReport> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(schoolId && { schoolId }),
      });
      const response = await api.get(`/compensation/report?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to get compensation report",
      );
    }
  },

  /**
   * Calculate compensation for a single lesson
   */
  async calculateLessonCompensation(
    instructorId: string,
    categoryId: string,
    durationHours: number,
    schoolId: string,
  ): Promise<number | null> {
    try {
      if (!schoolId) throw new Error("School ID is required");
      const params = new URLSearchParams({
        instructorId,
        categoryId,
        duration: durationHours.toString(),
        schoolId,
      });
      const response = await api.get(`/compensation/lesson?${params}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(
        error.response?.data?.message || "Failed to calculate lesson compensation",
      );
    }
  },


  async getInstructorMissingRatesCount(
    instructorId: string,
    schoolId: string,
  ): Promise<number> {
    try {
      const response = await api.get(
        `/compensation/instructor/${instructorId}/missing-rates?schoolId=${schoolId}`,
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to get missing rates count",
      );
    }
  },

  /**
   * Get instructor rates data (rates, school settings, categories)
   * Unified endpoint for Rates tab
   */
  async getInstructorRatesData(
    instructorId: string,
    schoolId: string,
  ): Promise<InstructorRatesData> {
    try {
      if (!schoolId) throw new Error("School ID is required");
      const response = await api.get(
        `/instructor/${instructorId}/rates-data?schoolId=${schoolId}`,
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructor rates data",
      );
    }
  },

  /**
   * Mark lesson compensation as paid/unpaid
   */
  async markLessonPaid(lessonId: string, paid: boolean): Promise<void> {
    try {
      await api.patch(`/compensation/lesson/${lessonId}/paid`, { paid });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update lesson payment status",
      );
    }
  },

  /**
   * Bulk mark lessons compensation as paid
   */
  async bulkMarkLessonsPaid(lessonIds: string[]): Promise<{ updatedCount: number }> {
    try {
      const response = await api.post("/compensation/lessons/bulk-mark-paid", { lessonIds });
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to bulk mark lessons as paid",
      );
    }
  },
};

