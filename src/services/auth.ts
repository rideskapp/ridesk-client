import api from "@/lib/api";
import { User } from "@/store/auth";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  // Optional for admin-created users; server generates temp if omitted
  password?: string;
  firstName: string;
  lastName: string;
  role?: string;
  schoolId?: string;
  isActive?: boolean;
  // Student fields
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
  studentLevel?: string;
  specialNeeds?: string[];
  specialNeedsOther?: string;
  // Consents
  consentPhysicalCondition?: boolean;
  consentTermsConditions?: boolean;
  consentGdpr?: boolean;
  consentPhotosVideos?: boolean;
  consentMarketing?: boolean;
  // Instructor fields
  specialties?: string[];
  languages?: string[];
  hourlyRate?: number;
  commissionRate?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Auth API functions
export const authApi = {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/login", credentials);
      console.log("Raw server response:", response.data);
      // Server returns { success: true, data: { user, token, refreshToken, expiresIn }, message: "..." }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  },

  // Change password for current user
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    try {
      const response = await api.put("/auth/password", {
        currentPassword,
        newPassword,
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to change password",
      );
    }
  },

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/register", userData);
      // Server returns { success: true, data: { user, token, refreshToken, expiresIn }, message: "..." }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  },

  // Get current user profile
  async getProfile(): Promise<User> {
    try {
      const response = await api.get("/auth/me");
      return response.data.data; // Server returns { success: true, data: user, message: "..." }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to get profile");
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error: any) {
      // Even if logout fails on server, we should clear local storage
      console.warn("Logout request failed:", error.response?.data?.message);
    }
  },

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/refresh");
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Token refresh failed");
    }
  },

  // Update user's school assignment
  async updateSchool(schoolId: string): Promise<AuthResponse> {
    const response = await api.put("/auth/school", { schoolId });
    return response.data.data;
  },

  // Demo login (for testing purposes)
  async demoLogin(role: "admin" | "instructor"): Promise<AuthResponse> {
    // This would typically call a demo endpoint on your server
    // For now, we'll simulate the response
    const userRole = role === "admin" ? "SCHOOL_ADMIN" : "INSTRUCTOR";

    return {
      user: {
        id: "1",
        email: `demo-${role}@ridesk.com`,
        firstName: "Demo",
        lastName: role === "admin" ? "Admin" : "Instructor",
        role: userRole,
        schoolId: "1",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: "demo-token",
    };
  },

  // Get all users with pagination
  async getUsers(
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<{
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const response = await api.get(`/auth/users?${params}`);
      return {
        users: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch users");
    }
  },

  // Update user
  async updateUser(
    userId: string,
    userData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      schoolId?: string;
      isActive?: boolean;
    },
  ): Promise<User> {
    try {
      const response = await api.put(`/auth/users/${userId}`, userData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to update user");
    }
  },

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    try {
      await api.delete(`/auth/deactivate/${userId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to delete user");
    }
  },

  // Request password reset (send OTP)
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post("/auth/forgot-password", { email });
      return {
        success: response.data.success,
        message: response.data.message || "Password reset code sent",
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to send password reset code",
      );
    }
  },

  // Reset password with OTP
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      return {
        success: response.data.success,
        message: response.data.message || "Password reset successfully",
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to reset password";

      if (error.response?.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
        throw new Error(validationErrors || errorMessage);
      }

      throw new Error(errorMessage);
    }
  },
};
