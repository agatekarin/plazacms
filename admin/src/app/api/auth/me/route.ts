import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth/service";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("plaza_session")?.value;
    const user = await AuthService.getCurrentUser(sessionToken);

    if (user) {
      return NextResponse.json({
        success: true,
        user,
        isAuthenticated: true,
        isAdmin: AuthService.hasRole(user, "admin"),
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Unauthorized", isAuthenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Get current user API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        isAuthenticated: false,
      },
      { status: 500 }
    );
  }
}
