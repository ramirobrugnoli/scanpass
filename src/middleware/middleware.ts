import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");

  // Auth routes that don't require authentication
  const authRoutes = ["/login", "/register", "/forgot-password"];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Protected routes
  const protectedRoutes = ["/dashboard"];
  // Temporary: no longer protect /scan to make testing easier
  // const protectedRoutes = ['/dashboard', '/scan'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Check auth status
  const isAuthenticated = Boolean(session);

  // Redirect based on auth status
  if (!isAuthenticated && isProtectedRoute) {
    // Redirect to login if trying to access protected route without auth
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isAuthRoute) {
    // Redirect to dashboard if trying to access auth routes while authenticated
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Specify which routes this middleware will run on
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scan/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
