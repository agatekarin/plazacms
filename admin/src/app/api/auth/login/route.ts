import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth/service";
import { LoginCredentials } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials: LoginCredentials = {
      email: body.email,
      password: body.password,
    };

    // Validate input
    if (!credentials.email || !credentials.password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await AuthService.login(credentials);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    // Create response with session cookie
    const response = NextResponse.json(result);

    if (result.session) {
      const cookieValue = AuthService.setSessionCookie(
        result.session.session_token
      );
      response.headers.set("Set-Cookie", cookieValue);
    }

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
