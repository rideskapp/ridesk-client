import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "INSTRUCTOR" | "USER";
  schoolId?: string;
  schoolName?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentProfileId?: string;
}

export interface StudentProfile {
  id: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  weight?: number;
  height?: number;
  canSwim?: boolean;
  primarySport?: string;
  ridingBackground?: string;
  preferredDays?: string[];
  preferredTimeSlots?: string[];
  preferredLessonTypes?: string[];
  preferredLanguage?: string;
  secondaryLanguage?: string;
  studentLevelId?: string;
  studentLevel?: string;
  specialNeeds?: string[];
  specialNeedsOther?: string;
  consentPhysicalCondition?: boolean;
  consentTermsConditions?: boolean;
  consentGdpr?: boolean;
  consentPhotosVideos?: boolean;
  consentMarketing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
  spotName?: string;
  windguruUrl?: string;
  disciplines: string[];
  openHoursStart?: string;
  openHoursEnd?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  // Profile cache + helpers
  studentProfile: StudentProfile | null;
  isProfileLoading: boolean;
  setProfile: (profile: StudentProfile | null) => void;
  loadStudentProfile: (profileId?: string) => Promise<StudentProfile | null>;
  invalidateStudentProfile: () => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      studentProfile: null,
      isProfileLoading: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setProfile: (profile) => set({ studentProfile: profile }),
      loadStudentProfile: async (profileId) => {
        const id = profileId || get().user?.studentProfileId;
        if (!id) return null;
        set({ isProfileLoading: true });
        try {
          const response = await api.get(`/students/${id}`);
          const profile = response.data.data as StudentProfile;
          set({ studentProfile: profile });
          return profile;
        } catch (error: any) {
          console.error("Failed to load student profile:", error);
          set({ studentProfile: null });
          return null;
        } finally {
          set({ isProfileLoading: false });
        }
      },
      invalidateStudentProfile: () => set({ studentProfile: null }),
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, studentProfile: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
