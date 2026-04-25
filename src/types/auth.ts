// User roles enum
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  INSTRUCTOR = "INSTRUCTOR",
  USER = "USER",
}

// Role display names for UI
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.SCHOOL_ADMIN]: "School Admin",
  [UserRole.INSTRUCTOR]: "Instructor",
  [UserRole.USER]: "User",
};

// Role descriptions for UI
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "Platform administrator with full access",
  [UserRole.SCHOOL_ADMIN]: "Manages a single watersports school",
  [UserRole.INSTRUCTOR]: "Teaches lessons at one or more schools",
  [UserRole.USER]: "Books lessons and manages personal account",
};
