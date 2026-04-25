// Export all types from auth
export * from "./auth";

export const ALL_SCHOOLS_ID = "ALL";

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "INSTRUCTOR" | "USER";
  schoolId?: string | null;
  schoolName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// School interface
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

// Auth response interface
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Pagination interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}
