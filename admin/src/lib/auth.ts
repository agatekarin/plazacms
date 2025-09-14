// New API-based auth for Hono backend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://admin-hono.agatekarin.workers.dev";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export async function loginWithAPI(
  email: string,
  password: string
): Promise<LoginResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth-token", token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth-token");
  }
  return null;
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-token");
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      removeAuthToken();
      return null;
    }

    const data = await response.json();
    return data.data.user;
  } catch (error) {
    console.error("Get current user error:", error);
    removeAuthToken();
    return null;
  }
}
