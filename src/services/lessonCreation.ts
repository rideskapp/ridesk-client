import { api } from "@/lib/api";

export interface LessonCreationData {
  instructorId: string;
  studentId?: string; 
  studentIds?: string[]; 
  productId?: string;
  bookingId?: string;
  date: string;
  time: string;
  duration: number; // in minutes
  discipline: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  notes?: string;
  lessonStatusId?: string;
  schoolId?: string; // For SUPER_ADMIN
}

export interface LessonStatus {
  id: string;
  name: string;
  display_name?: string;
  color: string;
  is_active: boolean;
}

export interface PaymentStatus {
  id: string;
  name: string;
  display_name?: string;
  color: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  title?: string; 
  discipline?: string;
  discipline_id?: string;
  disciplines?: {
    id: string;
    display_name: string;
    color: string;
  };
  duration?: number; 
  duration_hours?: number; 
  max_participants: number;
  price: number;
  description?: string;
  description_short?: string;
  product_categories?: {
    id: string;
    name: string;
    color: string;
  };
  active?: boolean;
  is_active?: boolean;
}

export const lessonCreationApi = {
  // Get lesson statuses
  async getLessonStatuses(schoolId?: string): Promise<LessonStatus[]> {
    const params = schoolId ? { schoolId } : {};
    const response = await api.get('/lesson-statuses', { params });
    return response.data.data;
  },

  // Kept for read-only displays and legacy dashboards.
  async getPaymentStatuses(schoolId?: string): Promise<PaymentStatus[]> {
    const params = schoolId ? { schoolId } : {};
    const response = await api.get('/payment-statuses', { params });
    return response.data.data;
  },

  // Get products
  async getProducts(): Promise<Product[]> {
    const response = await api.get('/products');
    return response.data.data;
  },

  // Create lesson
  async createLesson(lessonData: LessonCreationData): Promise<any> {
    const requestData: any = {
      instructor_id: lessonData.instructorId,
      date: lessonData.date,
      time: lessonData.time,
      duration: lessonData.duration,
      discipline: lessonData.discipline,
      source: 'manual'
    };

    if (lessonData.level) {
      requestData.level = lessonData.level;
    }

    if (lessonData.studentIds && lessonData.studentIds.length > 0) {
      requestData.student_ids = lessonData.studentIds;
    } else if (lessonData.studentId) {
      requestData.student_id = lessonData.studentId;
    }

    if (lessonData.productId) {
      requestData.product_id = lessonData.productId;
    }

    if (lessonData.bookingId) {
      requestData.booking_id = lessonData.bookingId;
    }

    if (lessonData.lessonStatusId) {
      requestData.lesson_status_id = lessonData.lessonStatusId;
    } else {
      requestData.status = 'pending';
    }

    // Only include notes if it has a value
    if (lessonData.notes && lessonData.notes.trim() !== '') {
      requestData.notes = lessonData.notes;
    }

    const url = lessonData.schoolId ? `/lessons?schoolId=${lessonData.schoolId}` : '/lessons';
    const response = await api.post(url, requestData);
    return response.data;
  },

  // Check instructor availability
  async checkAvailability(instructorId: string, date: string, timeStart: string, timeEnd: string): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await api.post('/availability/check', {
        instructorId,
        date,
        timeStart,
        timeEnd
      });
      return response.data;
    } catch (error: any) {
      return {
        available: false,
        message: error.response?.data?.message || 'Failed to check availability'
      };
    }
  }
};
