export type UserRole = "admin" | "vendor" | "customer" | "guest";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image?: string | null;
  email_verified?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  expires: Date;
  created_at: Date;
  updated_at: Date;
  user?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  message?: string;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasRole: (role: UserRole) => boolean;
}
