// Compatibility layer for old auth system
// This file provides backward compatibility while we migrate to new auth system

import { AuthService } from "./auth/service";
import { User } from "./auth/types";

// Export auth function for backward compatibility
export async function auth(): Promise<{ user?: User } | null> {
  try {
    const user = await AuthService.getCurrentUser();
    if (user) {
      return { user };
    }
    return null;
  } catch (error) {
    console.error("Auth compatibility layer error:", error);
    return null;
  }
}

// Re-export AuthService for backward compatibility
export { AuthService };
export { AuthService as default };

// Re-export types
export type {
  User,
  UserRole,
  Session,
  LoginCredentials,
  AuthResponse,
  AuthContext,
} from "./auth/types";
