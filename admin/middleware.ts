import { NextResponse, NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authConfig } from "./src/lib/auth.config";

const AUTH_SECRET = process.env.AUTH_SECRET;

export async function middleware(request: NextRequest) {
  const tokenCookie = request.headers
    .get("cookie")
    ?.split("; ")
    .find((row) => row.startsWith("next-auth.session-token="));
  const token = tokenCookie ? tokenCookie.split("=")[1] : undefined;

  let auth: any = null;
  if (token && AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(AUTH_SECRET)
      );
      auth = {
        user: {
          id: payload.id as string,
          role: payload.role as string,
        },
      };
    } catch (error) {
      console.error("JWT verification failed:", error);
      // Token invalid, treat as unauthenticated
    }
  }

  const authorized = authConfig.callbacks.authorized;
  const response = authorized({ auth, request });

  if (response === false) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*.png$).*)"],
};
