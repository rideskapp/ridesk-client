/**
 * @fileoverview Student management API service
 * @description Client-side API service for student CRUD operations
 * @author Ridesk Team
 * @version 1.0.0
 */

import { api } from "../lib/api";

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  skillLevel: string;
  preferredDisciplines: string[];
  nationality?: string;
  weight?: number;
  height?: number;
  canSwim?: boolean;
  primarySport?: "surf" | "kitesurf" | "wingfoil" | "foil";
  ridingBackground?: string;
  preferredDays?: string[];
  preferredTimeSlots?: string[];
  preferredLessonTypes?: string[];
  preferredLanguage?: string[];
  secondaryLanguage?: string;
  specialNeeds?: string[];
  consentPhysicalCondition?: boolean;
  consentTermsConditions?: boolean;
  consentGdpr?: boolean;
  consentPhotosVideos?: boolean;
  consentMarketing?: boolean;
  consentCustom1?: boolean | null;
  consentCustom2?: boolean | null;
  arrivalDate?: string;
  departureDate?: string;
  stayNotes?: string;
  notes?: string;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  skillLevel: string;
  preferredDisciplines: string[];
  nationality?: string;
  weight?: number;
  height?: number;
  canSwim?: boolean;
  primarySport?: "surf" | "kitesurf" | "wingfoil" | "foil";
  ridingBackground?: string;
  preferredDays?: string[];
  preferredTimeSlots?: string[];
  preferredLessonTypes?: string[];
  preferredLanguage?: string[];
  consentPhysicalCondition?: boolean;
  consentTermsConditions?: boolean;
  consentGdpr?: boolean;
  consentPhotosVideos?: boolean;
  consentMarketing?: boolean;
  consentCustom1?: boolean | null;
  consentCustom2?: boolean | null;
  arrivalDate?: string;
  departureDate?: string;
  stayNotes?: string;
  notes?: string;
  secondaryLanguage?: string;
  specialNeeds?: string[];
  specialNeedsOther?: string;
}

export interface UpdateStudentRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  skillLevel?: string;
  preferredDisciplines?: string[];
  nationality?: string;
  weight?: number;
  height?: number;
  canSwim?: boolean;
  primarySport?: "surf" | "kitesurf" | "wingfoil" | "foil";
  ridingBackground?: string;
  preferredDays?: string[];
  preferredTimeSlots?: string[];
  preferredLessonTypes?: string[];
  preferredLanguage?: string[];
  consentPhysicalCondition?: boolean;
  consentTermsConditions?: boolean;
  consentGdpr?: boolean;
  consentPhotosVideos?: boolean;
  consentMarketing?: boolean;
  consentCustom1?: boolean | null;
  consentCustom2?: boolean | null;
  arrivalDate?: string;
  departureDate?: string;
  stayNotes?: string;
  notes?: string;
  isActive?: boolean;
  secondaryLanguage?: string;
  specialNeeds?: string[];
  specialNeedsOther?: string;
}

export interface StudentsResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const studentsApi = {
  // Get all students with pagination and search
  async getStudents(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    schoolId?: string,
  ): Promise<StudentsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(schoolId && { schoolId }),
      });

      const response = await api.get(`/students?${params}`);
      return response.data.data;
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message || error?.response?.data?.error;
      if (error?.response?.status === 403) {
        const message =
          backendMessage ||
          "User not associated with any school. Please create your school first.";
        throw new Error(message);
      }
      throw new Error(backendMessage || "Failed to fetch students");
    }
  },

  // Search students
  async searchStudents(query: string): Promise<Student[]> {
    try {
      const response = await api.get(
        `/students/search?q=${encodeURIComponent(query)}`,
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to search students",
      );
    }
  },

  // Get student by ID
  async getStudentById(id: string, schoolId?: string): Promise<Student> {
    try {
      const url = schoolId
        ? `/students/${id}?schoolId=${schoolId}`
        : `/students/${id}`;
      const response = await api.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch student",
      );
    }
  },

  // Create new student
  async createStudent(
    studentData: CreateStudentRequest,
    schoolId?: string,
  ): Promise<Student> {
    try {
      const url = schoolId ? `/students?schoolId=${schoolId}` : "/students";
      const response = await api.post(url, studentData);
      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      }
      // Create error that preserves message but maintains error structure
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create student";
      const newError = new Error(errorMessage);
      (newError as any).response = error.response; // Preserve response if it exists
      throw newError;
    }
  },

  async createStudentBySchoolAdmin(
    studentData: CreateStudentRequest,
    schoolId?: string,
  ): Promise<{
    student?: Student;
    invitation?: any;
    message: string;
  }> {
    try {
      const url = schoolId
        ? `/students/school-admin?schoolId=${schoolId}`
        : "/students/school-admin";
      const response = await api.post(url, studentData);
      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      }
      // Create error that preserves message but maintains error structure
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create student";
      const newError = new Error(errorMessage);
      (newError as any).response = error.response; // Preserve response if it exists
      throw newError;
    }
  },

  // Update student
  async updateStudent(
    id: string,
    studentData: UpdateStudentRequest,
    schoolId?: string,
  ): Promise<Student> {
    try {
      const url = schoolId
        ? `/students/${id}?schoolId=${schoolId}`
        : `/students/${id}`;
      const response = await api.put(url, studentData);
      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw error;
      }
      // Create error that preserves message but maintains error structure
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update student";
      const newError = new Error(errorMessage);
      (newError as any).response = error.response; // Preserve response if it exists
      throw newError;
    }
  },

  // Delete student
  async deleteStudent(
    id: string,
    schoolId?: string,
  ): Promise<{ success: boolean }> {
    try {
      const url = schoolId
        ? `/students/${id}?schoolId=${schoolId}`
        : `/students/${id}`;
      const response = await api.delete(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete student",
      );
    }
  },
};
