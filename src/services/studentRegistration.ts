import { api } from "@/lib/api";

export interface PublicStudentRegistrationPayload {
  email: string;
  firstName: string;
  lastName: string;
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

export interface StudentRegistrationContextResponse {
  schoolId: string;
  name: string | null;
  logo: string | null;
  disciplines: Array<{
    id: string;
    slug: string;
    name: string;
    display_name: string;
    color?: string;
  }>;
  studentLevels: Array<{
    id: string;
    slug: string;
    name: string;
    is_active?: boolean;
    active?: boolean;
  }>;
  consentSettings: {
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
  };
}

export const studentRegistrationApi = {
  async getContext(
    schoolIdentifier: string,
  ): Promise<StudentRegistrationContextResponse> {
    const response = await api.get(`/student-registration/${schoolIdentifier}`);
    return response.data.data;
  },

  async register(
    schoolIdentifier: string,
    payload: PublicStudentRegistrationPayload,
  ): Promise<{ created?: boolean; alreadyLinked?: boolean; reactivated?: boolean; message: string }> {
    const response = await api.post(
      `/student-registration/${schoolIdentifier}`,
      payload,
    );
    return response.data.data;
  },
};
