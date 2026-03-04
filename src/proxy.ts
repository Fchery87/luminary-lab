import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Development bypass - allows testing without authentication
const DEV_BYPASS_ENABLED = process.env.DEV_BYPASS_AUTH === "true";
const DEV_USER_COOKIE = "dev_bypass_user";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Set development bypass cookie if enabled
  if (DEV_BYPASS_ENABLED && !request.cookies.get(DEV_USER_COOKIE)) {
    response.cookies.set(DEV_USER_COOKIE, "dev-user-123", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  // DNS prefetch control
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // HSTS - Enforce HTTPS
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  // XSS Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Clickjacking protection
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // MIME sniffing protection
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer policy
  response.headers.set("Referrer-Policy", "origin-when-cross-origin");

  // Permissions policy - only include well-supported features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  // Content Security Policy - adjust based on your needs
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.stripe.com https://*.r2.cloudflarestorage.com wss:; frame-src 'self' https://js.stripe.com;",
  );

  return response;
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
