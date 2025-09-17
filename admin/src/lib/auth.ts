// Minimal stub to satisfy imports in legacy Next.js API routes.
// The app uses Auth.js (Hono) for authentication now.

export type Session = {
  user?: {
    id?: string;
    role?: string;
    email?: string;
    name?: string;
  };
} | null;

export async function auth(): Promise<Session> {
  // Always return null in this stub. Legacy API routes are kept for reference only.
  return null;
}
