import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if accessing admin routes
  if (pathname.startsWith("/admin")) {
    const sessionToken = request.cookies.get("plaza_session")?.value;

    if (!sessionToken) {
      // Redirect to signin if no session
      const url = new URL("/signin", request.url);
      url.searchParams.set("error", "access_denied");
      return NextResponse.redirect(url);
    }

    // For now, just check if session cookie exists
    // Actual validation will be done in the page components
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
