import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth/service";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("plaza_session")?.value;

    // Logout (will handle missing token gracefully)
    const result = await AuthService.logout(sessionToken);

    // Create response and clear session cookie
    const response = NextResponse.json(result);
    response.cookies.delete("plaza_session");

    return response;
  } catch (error) {
    console.error("Logout API error:", error);

    // Even on error, clear the cookie
    const response = NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
    response.cookies.delete("plaza_session");

    return response;
  }
}
