export { auth as middleware } from "next-auth/middleware";

// Protect everything except these paths
export const config = {
  matcher: [
    "/((?!api/auth|_next|favicon.ico|signin|public|assets).*)",
  ],
};
