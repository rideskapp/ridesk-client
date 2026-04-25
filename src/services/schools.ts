import api from "@/lib/api";

export interface School {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  disciplines: string[];
  openHoursStart?: string;
  openHoursEnd?: string;
  defaultLessonStatusId?: string;
  defaultPaymentStatusId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolRequest {
  name: string;
  slug?: string; 
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  openHoursStart?: string;
  openHoursEnd?: string;
  disciplines?: string[];
}

export interface UpdateSchoolRequest {
  name?: string;
  slug?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  openHoursStart?: string;
  openHoursEnd?: string;
  disciplines?: string[];
  defaultLessonStatusId?: string;
  defaultPaymentStatusId?: string;
}

export interface SchoolsResponse {
  success: boolean;
  data: School[];
  message: string;
}

export interface SchoolResponse {
  success: boolean;
  data: School;
  message: string;
}

// Schools API functions
export const schoolsApi = {
  // Get all schools
  async getAll(page?: number, limit?: number): Promise<School[]> {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    const queryString = params.toString();
    const url = `/schools${queryString ? `?${queryString}` : "?limit=100"}`;
    const response = await api.get(url);
    return response.data.data;
  },

  // Get school by ID
  async getById(id: string): Promise<School> {
    const response = await api.get(`/schools/${id}`);
    return response.data.data;
  },

  // Get school by slug
  async getBySlug(slug: string): Promise<School> {
    const response = await api.get(`/schools/slug/${slug}`);
    return response.data.data;
  },

  // Get school by user ID
  async getByUserId(userId: string): Promise<School | null> {
    const response = await api.get(`/schools/user/${userId}`);
    return response.data.data; // Will be null if user has no school
  },

  // Create new school
  async create(schoolData: CreateSchoolRequest): Promise<School> {
    const response = await api.post("/schools", schoolData);
    return response.data.data;
  },

  // Update school
  async update(id: string, schoolData: UpdateSchoolRequest): Promise<School> {
    const response = await api.put(`/schools/${id}`, schoolData);
    return response.data.data;
  },

  // Delete school
  async delete(id: string): Promise<void> {
    await api.delete(`/schools/${id}`);
  },

  // Search schools
  async search(query: string): Promise<School[]> {
    const response = await api.get(
      `/schools/search?q=${encodeURIComponent(query)}`,
    );
    return response.data.data;
  },
};
