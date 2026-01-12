import type { UserProfileUpdate, UserRow } from "../../services/userService";

export type { UserRow, UserProfileUpdate };

// Shared user shape across all user components.
export type User = UserRow;

export type UserRole = UserRow["role"];

export const USER_ROLES: UserRole[] = ["admin", "editor", "viewer"];

export type UserCreatePayload = {
  email: string;
  password: string;
  role: UserRole;
  is_active?: 0 | 1;
} & UserProfileUpdate;

export type UserUpdatePayload = Partial<{ role: UserRole; password: string; is_active: 0 | 1 }> & UserProfileUpdate;
