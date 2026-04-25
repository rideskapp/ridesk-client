import api from "@/lib/api";

export interface InstructorRegistrationSchoolResponse {
  success: boolean;
  data: {
    schoolId: string;
    name: string;
    logo: string | null;
  };
}

export interface InstructorRegistrationRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  whatsappNumber?: string;
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  isPrimary?: boolean;
}

export interface InstructorRegistrationResponse {
  success: boolean;
  data: {
    created?: boolean;
    alreadyLinked?: boolean;
    reactivated?: boolean;
    message: string;
  };
}

export const instructorRegistrationApi = {
  async getSchoolInfo(
    schoolIdentifier: string,
  ): Promise<InstructorRegistrationSchoolResponse> {
    const response = await api.get(
      `/instructor-registration/${encodeURIComponent(schoolIdentifier)}`,
    );
    return response.data;
  },

  async registerInstructor(
    schoolIdentifier: string,
    payload: InstructorRegistrationRequest,
  ): Promise<InstructorRegistrationResponse> {
    const response = await api.post(
      `/instructor-registration/${encodeURIComponent(schoolIdentifier)}`,
      payload,
    );
    return response.data;
  },
};

