import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const SESSION_COOKIE_NAME = "scid";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export async function getOrCreateSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = uuidv4();
  store.set(SESSION_COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SEC,
  });
  return id;
}
