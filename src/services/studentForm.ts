/**
 * @fileoverview Student form API service
 * @description Client-side API service for student form validation and submission
 * @author Ridesk Team
 * @version 1.0.1
 */

import { api } from "../lib/api";
import { Student } from "./students";

export interface ConsentSettings {
  termsConditionsUrl: string | null;
  termsConditionsLabel: Record<string, string> | null;
  customCheckbox1Enabled: boolean;
  customCheckbox1Label: Record<string, string> | null;
  customCheckbox1Url: string | null;
  customCheckbox1Mandatory: boolean;
  customCheckbox2Enabled: boolean;
  customCheckbox2Label: Record<string, string> | null;
  customCheckbox2Url: string | null;
  customCheckbox2Mandatory: boolean;
}

export interface StudentFormValidationResponse {
  success: boolean;
  data: {
    student: Student;
    formSubmitted: boolean;
    formSubmittedAt: string | null;
    disciplines: Array<{
      id: string;
      name: string;
      slug: string;
      display_name: string;
      color?: string;
    }>;
    studentLevels: Array<{
      id: string;
      name: string;
      slug: string;
      color?: string;
      is_active?: boolean;
      active?: boolean;
    }>;
    consentSettings: ConsentSettings;
  };
}

export interface SubmitStudentFormRequest {
  token: string;
  firstName: string;
  lastName: string;
  phone?: string;
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
}

export interface SubmitStudentFormResponse {
  success: boolean;
  data: Student;
  message: string;
}

export const studentFormApi = {
  async validateToken(token: string): Promise<StudentFormValidationResponse> {
    const response = await api.get(`/student-form/validate/${token}`);
    return response.data;
  },

  async submitForm(
    formData: SubmitStudentFormRequest,
  ): Promise<SubmitStudentFormResponse> {
    const response = await api.post("/student-form/submit", formData);
    return response.data;
  },
};
