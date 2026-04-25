import api from "@/lib/api";

export interface Booking {
  id: string;
  school_id: string;
  product_id: string;
  total_minutes: number;
  remaining_minutes: number;
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "cancelled";
  total_price?: number;
  discount_amount?: number;
  final_price?: number;
  outstanding_amount?: number;
  payment_status?: "unpaid" | "partially_paid" | "paid" | "pending" | "overdue";
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    title?: string;
    name?: string;
    duration_hours?: number;
    product_categories?: {
      associable_to_lessons?: boolean;
    };
    disciplines?: {
      id: string;
      slug: string;
      display_name: string;
      color: string;
    };
  };
  participants?: Array<{
    id: string;
    student_id: string;
    users?: { first_name?: string; last_name?: string; email?: string };
  }>;
  lessons_count?: number;
}

export interface CreateBookingRequest {
  product_id: string;
  student_ids?: string[];
  student_id?: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD (optional)
  notes?: string;
  total_price?: number;
  discount_amount?: number;
  schoolId?: string;
}

export interface UpdateBookingRequest {
  product_id?: string;
  student_ids?: string[];
  start_date?: string;
  end_date?: string | null;
  status?: "active" | "completed" | "cancelled";
  notes?: string;
  total_price?: number;
  discount_amount?: number;
}

export interface BookingPayment {
  id: string;
  booking_id: string;
  school_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface BookingsListResponse {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const bookingsApi = {
  async create(data: CreateBookingRequest): Promise<Booking> {
    const { schoolId, ...body } = data;
    const url = schoolId ? `/bookings?schoolId=${schoolId}` : "/bookings";
    const response = await api.post(url, body);
    return response.data.data as Booking;
  },
  async list(params?: {
    status?: string;
    studentId?: string;
    productId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    schoolId?: string;
    page?: number;
    limit?: number;
    activeOnly?: boolean;
  }): Promise<BookingsListResponse> {
    const qs = new URLSearchParams();
    if (params?.status) qs.append("status", params.status);
    if (params?.studentId) qs.append("studentId", params.studentId);
    if (params?.productId) qs.append("productId", params.productId);
    if (params?.search) qs.append("search", params.search);
    if (params?.startDate) qs.append("startDate", params.startDate);
    if (params?.endDate) qs.append("endDate", params.endDate);
    if (params?.schoolId) qs.append("schoolId", params.schoolId);
    if (params?.page) qs.append("page", params.page.toString());
    if (params?.limit) qs.append("limit", params.limit.toString());
    if (params?.activeOnly === false) qs.append("activeOnly", "false");
    const response = await api.get(`/bookings?${qs.toString()}`);
    return response.data.data as BookingsListResponse;
  },
  async getById(id: string, schoolId?: string): Promise<Booking> {
    const url = schoolId
      ? `/bookings/${id}?schoolId=${schoolId}`
      : `/bookings/${id}`;
    const response = await api.get(url);
    return response.data.data as Booking;
  },
  async update(
    id: string,
    data: UpdateBookingRequest,
    schoolId?: string,
  ): Promise<Booking> {
    const url = schoolId
      ? `/bookings/${id}?schoolId=${schoolId}`
      : `/bookings/${id}`;
    const response = await api.patch(url, data);
    return response.data.data as Booking;
  },
  async delete(id: string, schoolId?: string): Promise<{ id: string }> {
    const url = schoolId
      ? `/bookings/${id}?schoolId=${schoolId}`
      : `/bookings/${id}`;
    const response = await api.delete(url);
    return response.data.data as { id: string };
  },
  async listPayments(id: string, schoolId?: string): Promise<BookingPayment[]> {
    const url = schoolId
      ? `/bookings/${id}/payments?schoolId=${schoolId}`
      : `/bookings/${id}/payments`;
    const response = await api.get(url);
    return response.data.data as BookingPayment[];
  },
  async addPayment(
    id: string,
    data: {
      amount: number;
      payment_date: string;
      payment_method?: string;
      notes?: string;
    },
    schoolId?: string,
  ): Promise<BookingPayment> {
    const url = schoolId
      ? `/bookings/${id}/payments?schoolId=${schoolId}`
      : `/bookings/${id}/payments`;
    const response = await api.post(url, data);
    return response.data.data as BookingPayment;
  },
};
