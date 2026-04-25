
import { api } from "@/lib/api";

export interface MultilingualText {
  en?: string;
  it?: string;
  [key: string]: string | undefined;
}

export interface SchoolSettings {
  id: string;
  schoolId: string;
  lessonColorScheme: "discipline" | "student_level" | "category";
  customColorOverrides: Record<string, any>;
  compensationMode: "fixed" | "variable";
  defaultCurrency: string;
  // Consent settings
  termsConditionsUrl?: string | null;
  termsConditionsLabel?: MultilingualText | null;
  customCheckbox1Enabled: boolean;
  customCheckbox1Label?: MultilingualText | null;
  customCheckbox1Url?: string | null;
  customCheckbox1Mandatory: boolean;
  customCheckbox2Enabled: boolean;
  customCheckbox2Label?: MultilingualText | null;
  customCheckbox2Url?: string | null;
  customCheckbox2Mandatory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSchoolSettingsRequest {
  lessonColorScheme?: "discipline" | "student_level" | "category";
  customColorOverrides?: Record<string, any>;
  compensationMode?: "fixed" | "variable";
  defaultCurrency?: string;
  // Consent settings
  termsConditionsUrl?: string | null;
  termsConditionsLabel?: MultilingualText | null;
  customCheckbox1Enabled?: boolean;
  customCheckbox1Label?: MultilingualText | null;
  customCheckbox1Url?: string | null;
  customCheckbox1Mandatory?: boolean;
  customCheckbox2Enabled?: boolean;
  customCheckbox2Label?: MultilingualText | null;
  customCheckbox2Url?: string | null;
  customCheckbox2Mandatory?: boolean;
}

// School Settings API functions
export const schoolSettingsApi = {
  async getBySchoolId(schoolId: string): Promise<SchoolSettings> {
    const response = await api.get(`/school-settings/${schoolId}`);
    return response.data.data;
  },

  // Update school settings
  async update(schoolId: string, settingsData: UpdateSchoolSettingsRequest): Promise<SchoolSettings> {
    const response = await api.put(`/school-settings/${schoolId}`, settingsData);
    return response.data.data;
  },
};
