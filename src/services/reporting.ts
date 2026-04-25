import { api } from "../lib/api";

export interface ReportingData {
  overview: {
    totalRevenue: number;
    bookingCount: number;
    studentCount: number;
    averageRevenuePerBooking: number;
  };
  breakdownByBookingType: Array<{
    type: string;
    revenue: number;
    count: number;
  }>;
  breakdownByDiscipline: Array<{
    discipline: string;
    revenue: number;
    count: number;
  }>;
  breakdownByInstructor: Array<{
    instructorId: string;
    instructorName: string;
    revenue: number;
    lessonCount: number;
  }>;
  paidVsPending: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

export const reportingApi = {
  getReportingData: async (
    schoolId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReportingData> => {
    try {
      const params = new URLSearchParams();
      if (schoolId) params.append("schoolId", schoolId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const queryString = params.toString();
      const url = queryString ? `/reporting?${queryString}` : '/reporting';
      const response = await api.get(url);
      return response.data.data;
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message || error?.response?.data?.error;
      throw new Error(backendMessage || "Failed to fetch reporting data");
    }
  },
};

