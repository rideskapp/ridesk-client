/**
 * @fileoverview User invitation service for Ridesk Client
 * @description API client for user invitation endpoints
 * @author Ridesk Team
 * @version 1.0.0
 */

import { api } from "../lib/api";

// ============================================================================
// TYPES
// ============================================================================

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: "INSTRUCTOR" | "USER";
  phoneNumber?: string;
  // Instructor-specific fields
  specialties?: string[];
  languages?: string[];
  hourlyRate?: number;
  commissionRate?: number;
  // Student-specific fields
  studentLevel?: "beginner" | "intermediate" | "advanced";
  preferredLanguage?: string;
  secondaryLanguage?: string;
  specialNeeds?: string[];
  specialNeedsOther?: string;
  height?: number;
  weight?: number;
}

export interface UserInvitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "INSTRUCTOR" | "USER";
  schoolId: string;
  invitedBy: string;
  invitedByName: string;
  invitationToken: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationResponse {
  success: boolean;
  data: UserInvitation;
  message: string;
}

export interface InvitationsListResponse {
  success: boolean;
  data: UserInvitation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message: string;
}

export interface InvitationValidationResponse {
  success: boolean;
  data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    schoolName: string;
    expiresAt: string;
  };
  message: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  data: {
    user: any;
    message: string;
  };
  message: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export const invitationsApi = {
  // Create user invitation
  async createInvitation(invitationData: InviteUserRequest): Promise<InvitationResponse> {
    const response = await api.post("/invitations", invitationData);
    return response.data;
  },

  // Get school invitations
  async getInvitations(page: number = 1, limit: number = 20, schoolId?: string, isUsed: boolean = false): Promise<InvitationsListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      isUsed: isUsed.toString(),
    });
    
    if (schoolId) {
      params.append('schoolId', schoolId);
    }
    
    const response = await api.get(`/invitations?${params.toString()}`);
    return response.data;
  },

  // Cancel invitation
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/invitations/${invitationId}`);
    return response.data;
  },

  // Accept invitation
  async acceptInvitation(acceptData: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
    const response = await api.post("/invitations/accept", acceptData);
    return response.data;
  },

  // Validate invitation token
  async validateInvitation(token: string): Promise<InvitationValidationResponse> {
    const response = await api.get(`/invitations/validate/${token}`);
    return response.data;
  },

  // Get invitation by user ID
  async getInvitationByUserId(userId: string): Promise<InvitationResponse> {
    const response = await api.get(`/invitations/user/${userId}`);
    return response.data;
  },

  // Resend invitation
  async resendInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/invitations/${invitationId}/resend`);
    return response.data;
  },
};
