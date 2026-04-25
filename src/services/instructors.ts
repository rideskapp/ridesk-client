/**
 * @fileoverview Instructor management API service
 * @description Client-side API service for instructor CRUD operations
 * @author Ridesk Team
 * @version 1.0.0
 */

import { api } from "../lib/api";
import { InstructorRate } from "./compensation";

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber?: string;
  avatar?: string;
  specialties: string[];
  certifications: string[];
  languages: string[];
  notes?: string;
  hourlyRate?: number;
  commissionRate?: number;
  isPrimary: boolean;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  canEditLessons?: boolean;
}

export interface CreateInstructorRequest {
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber?: string;
  avatar?: string;
  specialties: string[];
  certifications: string[];
  languages: string[];
  hourlyRate?: number;
  commissionRate?: number;
  isPrimary: boolean;
}

export interface UpdateInstructorRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  whatsappNumber?: string;
  avatar?: string;
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  notes?: string;
  hourlyRate?: number;
  commissionRate?: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface UpdateInstructorProfileRequest {
  firstName: string;
  lastName: string;
  whatsappNumber?: string;
  avatar?: string;
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface InstructorProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  whatsapp_number?: string;
  avatar?: string;
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  hourly_rate?: number;
  commission_rate?: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rates?: InstructorRate[];
  ratesWarning?: string;
}

export interface InstructorsResponse {
  instructors: Instructor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudentFromLessons {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  whatsappNumber?: string | null;
  lessonCount: number;
}

export interface StudentsFromLessonsResponse {
  students: StudentFromLessons[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const instructorsApi = {
  /**
   * Get students who have lessons with an instructor (for instructor profile Students tab).
   * - INSTRUCTOR: omit instructorId; uses JWT.
   * - SCHOOL_ADMIN: pass instructorId of the profile being viewed.
   */
  async getStudentsFromLessons(params?: {
    instructorId?: string;
    page?: number;
    limit?: number;
  }): Promise<StudentsFromLessonsResponse> {
    try {
      const { instructorId, page = 1, limit = 10 } = params || {};
      const search = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (instructorId) search.set("instructorId", instructorId);
      const response = await api.get(`/instructor/students?${search}`);
      return response.data.data;
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to fetch students from lessons";
      throw new Error(msg);
    }
  },

  // Get all instructors with pagination and search
  async getInstructors(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    schoolId?: string,
  ): Promise<InstructorsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(schoolId && { schoolId }),
      });

      const response = await api.get(`/instructors?${params}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructors",
      );
    }
  },

  // Fetch all instructors traversing pagination
  async fetchAllInstructors(schoolId?: string): Promise<Instructor[]> {
    const limit = 100;
    let page = 1;
    const maxPages = 100; // Safety limit
    const allInstructors: Instructor[] = [];
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const response = await this.getInstructors(page, limit, "", schoolId);
      allInstructors.push(...response.instructors);

      if (
        !response.pagination ||
        page >= response.pagination.totalPages ||
        response.instructors.length === 0
      ) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (page > maxPages && hasMore) {
      console.warn(
        `fetchAllInstructors: Reached maxPages limit (${maxPages}). Results may be incomplete.`,
      );
    }

    return allInstructors;
  },

  // Search instructors
  async searchInstructors(query: string): Promise<Instructor[]> {
    try {
      const response = await api.get(
        `/instructors/search?q=${encodeURIComponent(query)}`,
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to search instructors",
      );
    }
  },

  // Get instructor by ID
  async getInstructorById(id: string, schoolId?: string): Promise<Instructor> {
    try {
      const url = schoolId
        ? `/instructors/${id}?schoolId=${schoolId}`
        : `/instructors/${id}`;
      const response = await api.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructor",
      );
    }
  },

  // Create new instructor
  async createInstructor(
    instructorData: CreateInstructorRequest,
  ): Promise<Instructor> {
    try {
      const response = await api.post("/instructors", instructorData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to create instructor",
      );
    }
  },

  async createInstructorBySchoolAdmin(
    instructorData: CreateInstructorRequest,
    schoolId?: string,
  ): Promise<{
    instructor?: Instructor;
    invitation?: any;
    message: string;
  }> {
    try {
      const url = schoolId
        ? `/instructors/school-admin?schoolId=${schoolId}`
        : "/instructors/school-admin";
      const response = await api.post(url, instructorData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to create instructor",
      );
    }
  },

  // Update instructor
  async updateInstructor(
    id: string,
    instructorData: UpdateInstructorRequest,
    schoolId?: string,
  ): Promise<Instructor> {
    try {
      const url = schoolId
        ? `/instructors/${id}?schoolId=${schoolId}`
        : `/instructors/${id}`;
      const response = await api.put(url, instructorData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update instructor",
      );
    }
  },

  // Delete instructor
  async deleteInstructor(
    id: string,
    schoolId?: string,
  ): Promise<{ success: boolean }> {
    try {
      const url = schoolId
        ? `/instructors/${id}?schoolId=${schoolId}`
        : `/instructors/${id}`;
      const response = await api.delete(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete instructor",
      );
    }
  },

  async getInstructorProfile(): Promise<InstructorProfile> {
    try {
      const response = await api.get("/instructor/profile");
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructor profile",
      );
    }
  },

  async updateInstructorProfile(
    profileData: UpdateInstructorProfileRequest,
  ): Promise<InstructorProfile> {
    try {
      const response = await api.put("/instructor/profile", profileData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update instructor profile",
      );
    }
  },

  // Get instructor statistics for a school
  async getStats(
    schoolId?: string,
  ): Promise<{ activeCount: number; totalCount: number }> {
    try {
      const params = schoolId ? { schoolId } : {};
      const response = await api.get("/instructors/stats", { params });
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructor stats",
      );
    }
  },
};
